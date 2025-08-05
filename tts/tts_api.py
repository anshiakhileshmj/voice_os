#!/usr/bin/env python3
"""
Advanced TTS API with retry logic and fallback system
Replaces ElevenLabs with instant, reliable multilingual TTS
"""

import os
import io
import logging
import asyncio
import time
import subprocess
import tempfile
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Advanced TTS API", version="2.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TTSRequest(BaseModel):
    text: str
    voice_id: str
    language: str
    speed: float = 1.0
    use_fallback: bool = True
    # ElevenLabs-style voice settings
    stability: float = 0.6
    similarity_boost: float = 0.7
    use_speaker_boost: bool = False

class TTSResponse(BaseModel):
    success: bool
    message: str
    model_used: str

# Enhanced voice configurations with fallback mapping
VOICE_CONFIGS = {
    'en-us-female-1': {
        'language': 'en', 'gender': 'female', 'accent': 'us',
        'edge_voice': 'en-US-AriaNeural', 'gtts_lang': 'en'
    },
    'en-us-male-1': {
        'language': 'en', 'gender': 'male', 'accent': 'us',
        'edge_voice': 'en-US-GuyNeural', 'gtts_lang': 'en'
    },
    'en-uk-female-1': {
        'language': 'en', 'gender': 'female', 'accent': 'uk',
        'edge_voice': 'en-GB-SoniaNeural', 'gtts_lang': 'en'
    },
    'en-uk-male-1': {
        'language': 'en', 'gender': 'male', 'accent': 'uk',
        'edge_voice': 'en-GB-RyanNeural', 'gtts_lang': 'en'
    },
    'hi-female-1': {
        'language': 'hi', 'gender': 'female',
        'edge_voice': 'hi-IN-SwaraNeural', 'gtts_lang': 'hi'
    },
    'hi-male-1': {
        'language': 'hi', 'gender': 'male',
        'edge_voice': 'hi-IN-MadhurNeural', 'gtts_lang': 'hi'
    },
    'de-female-1': {
        'language': 'de', 'gender': 'female',
        'edge_voice': 'de-DE-KatjaNeural', 'gtts_lang': 'de'
    },
    'de-male-1': {
        'language': 'de', 'gender': 'male',
        'edge_voice': 'de-DE-ConradNeural', 'gtts_lang': 'de'
    },
    'fr-female-1': {
        'language': 'fr', 'gender': 'female',
        'edge_voice': 'fr-FR-DeniseNeural', 'gtts_lang': 'fr'
    },
    'fr-male-1': {
        'language': 'fr', 'gender': 'male',
        'edge_voice': 'fr-FR-HenriNeural', 'gtts_lang': 'fr'
    },
}

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY = 1.0  # seconds
TIMEOUT = 15  # seconds

def generate_with_gtts(text: str, voice_config: Dict[str, Any], tts_settings: Dict[str, Any]) -> bytes:
    """Generate speech using Google TTS with retry logic"""
    for attempt in range(MAX_RETRIES):
        try:
            from gtts import gTTS
            
            # Use the mapped language
            lang = voice_config.get('gtts_lang', 'en')
            
            # Generate speech
            tts = gTTS(text=text, lang=lang, slow=False)
            
            # Save to bytes
            audio_bytes = io.BytesIO()
            tts.write_to_fp(audio_bytes)
            audio_bytes.seek(0)
            
            logger.info(f"gTTS successful on attempt {attempt + 1}")
            return audio_bytes.getvalue()
            
        except Exception as e:
            logger.warning(f"gTTS attempt {attempt + 1} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
            else:
                logger.error(f"gTTS failed after {MAX_RETRIES} attempts")
                raise

def generate_with_edge_tts(text: str, voice_config: Dict[str, Any], tts_settings: Dict[str, Any]) -> bytes:
    """Generate speech using Microsoft Edge TTS with enhanced retry logic and ElevenLabs-style settings"""
    voice = voice_config.get('edge_voice', 'en-US-AriaNeural')
    
    # Apply ElevenLabs-style settings to Edge TTS
    # Convert our settings to Edge TTS SSML parameters
    rate = tts_settings.get('speed', 1.0)
    volume = tts_settings.get('stability', 0.6) * 100  # Convert to percentage
    pitch = tts_settings.get('similarity_boost', 0.7) * 50  # Convert to pitch adjustment
    
    # Create SSML with voice settings
    ssml_text = f"""
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" 
            xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">
        <voice name="{voice}">
            <prosody rate="{rate}" volume="{volume}%" pitch="{pitch}%">
                {text}
            </prosody>
        </voice>
    </speak>
    """
    
    for attempt in range(MAX_RETRIES):
        try:
            # Use subprocess with timeout
            with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as temp_file:
                temp_path = temp_file.name
            
            try:
                # Run edge-tts command with SSML
                cmd = [
                    'edge-tts',
                    '--voice', voice,
                    '--text', ssml_text,
                    '--write-media', temp_path
                ]
                
                result = subprocess.run(
                    cmd, 
                    capture_output=True, 
                    text=True, 
                    timeout=TIMEOUT
                )
                
                if result.returncode != 0:
                    raise Exception(f"Edge TTS command failed: {result.stderr}")
                
                # Read the generated audio file
                with open(temp_path, 'rb') as f:
                    audio_data = f.read()
                
                logger.info(f"Edge TTS successful on attempt {attempt + 1} with settings: rate={rate}, volume={volume}%, pitch={pitch}%")
                return audio_data
                
            finally:
                # Clean up temp file
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                    
        except subprocess.TimeoutExpired:
            logger.warning(f"Edge TTS timeout on attempt {attempt + 1}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
            else:
                raise Exception("Edge TTS timed out after all retries")
                
        except Exception as e:
            logger.warning(f"Edge TTS attempt {attempt + 1} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
            else:
                logger.error(f"Edge TTS failed after {MAX_RETRIES} attempts")
                raise

def generate_speech_with_fallback(text: str, voice_config: Dict[str, Any], tts_settings: Dict[str, Any]) -> tuple[bytes, str]:
    """Generate speech with automatic fallback from Edge TTS to Google TTS"""
    
    # Try Edge TTS first (better quality for supported languages)
    try:
        audio_data = generate_with_edge_tts(text, voice_config, tts_settings)
        return audio_data, "edge-tts"
        
    except Exception as e:
        logger.warning(f"Edge TTS failed, falling back to Google TTS: {e}")
        
        # Fallback to Google TTS
        try:
            audio_data = generate_with_gtts(text, voice_config, tts_settings)
            return audio_data, "gtts-fallback"
            
        except Exception as e2:
            logger.error(f"Both Edge TTS and Google TTS failed: {e2}")
            raise Exception(f"TTS generation failed: Edge TTS error: {e}, Google TTS error: {e2}")

@app.post("/api/tts/generate")
async def generate_speech(request: TTSRequest):
    """Main TTS endpoint with automatic fallback and ElevenLabs-style settings"""
    try:
        voice_config = VOICE_CONFIGS.get(request.voice_id)
        if not voice_config:
            raise HTTPException(status_code=400, detail="Invalid voice ID")
        
        # Extract ElevenLabs-style settings
        tts_settings = {
            'speed': request.speed,
            'stability': request.stability,
            'similarity_boost': request.similarity_boost,
            'use_speaker_boost': request.use_speaker_boost
        }
        
        # Generate audio with fallback
        audio_data, model_used = generate_speech_with_fallback(request.text, voice_config, tts_settings)
        
        # Return audio as streaming response
        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "attachment; filename=speech.mp3",
                "X-Model-Used": model_used,
                "X-TTS-Settings": str(tts_settings)
            }
        )
        
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tts/gtts")
async def gtts_endpoint(request: TTSRequest):
    """Google TTS endpoint (direct)"""
    try:
        voice_config = VOICE_CONFIGS.get(request.voice_id)
        if not voice_config:
            raise HTTPException(status_code=400, detail="Invalid voice ID")
        
        # Extract settings
        tts_settings = {
            'speed': request.speed,
            'stability': request.stability,
            'similarity_boost': request.similarity_boost,
            'use_speaker_boost': request.use_speaker_boost
        }
        
        # Generate audio
        audio_data = generate_with_gtts(request.text, voice_config, tts_settings)
        
        # Return audio as streaming response
        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "attachment; filename=speech.mp3"}
        )
        
    except Exception as e:
        logger.error(f"gTTS endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tts/edge")
async def edge_tts_endpoint(request: TTSRequest):
    """Microsoft Edge TTS endpoint (direct)"""
    try:
        voice_config = VOICE_CONFIGS.get(request.voice_id)
        if not voice_config:
            raise HTTPException(status_code=400, detail="Invalid voice ID")
        
        # Extract settings
        tts_settings = {
            'speed': request.speed,
            'stability': request.stability,
            'similarity_boost': request.similarity_boost,
            'use_speaker_boost': request.use_speaker_boost
        }
        
        # Generate audio
        audio_data = generate_with_edge_tts(request.text, voice_config, tts_settings)
        
        # Return audio as streaming response
        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "attachment; filename=speech.mp3"}
        )
        
    except Exception as e:
        logger.error(f"Edge TTS endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tts/voices")
async def get_available_voices():
    """Get list of available voices with model information"""
    return {
        "voices": [
            {
                "id": voice_id,
                "name": f"{config['gender'].title()} ({config['language'].upper()})",
                "language": config['language'],
                "gender": config['gender'],
                "accent": config.get('accent'),
                "primary_model": "edge-tts",
                "fallback_model": "gtts",
                "edge_voice": config.get('edge_voice'),
                "gtts_lang": config.get('gtts_lang')
            }
            for voice_id, config in VOICE_CONFIGS.items()
        ]
    }

@app.get("/api/tts/health")
async def health_check():
    """Enhanced health check endpoint"""
    try:
        # Test both models
        test_text = "Hello"
        test_config = VOICE_CONFIGS['en-us-female-1']
        test_settings = {
            'speed': 1.0,
            'stability': 0.6,
            'similarity_boost': 0.7,
            'use_speaker_boost': False
        }
        
        # Quick test of both models
        gtts_working = False
        edge_working = False
        
        try:
            generate_with_gtts(test_text, test_config, test_settings)
            gtts_working = True
        except:
            pass
            
        try:
            generate_with_edge_tts(test_text, test_config, test_settings)
            edge_working = True
        except:
            pass
        
        return {
            "status": "healthy" if (gtts_working or edge_working) else "degraded",
            "service": "Advanced TTS API v2.0",
            "models_available": {
                "gtts": gtts_working,
                "edge_tts": edge_working,
                "fallback_system": True
            },
            "features": {
                "retry_logic": True,
                "automatic_fallback": True,
                "multilingual": True,
                "instant_response": True,
                "elevenlabs_style_settings": True
            },
            "voice_settings": {
                "stability": "0.6 (ElevenLabs-style)",
                "similarity_boost": "0.7 (ElevenLabs-style)",
                "speed": "1.0 (ElevenLabs-style)",
                "use_speaker_boost": "false (ElevenLabs-style)"
            }
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
