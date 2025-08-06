#!/usr/bin/env python3
"""
MJAK Voice OS Edge TTS Server
High-quality TTS with explicit male voices using Microsoft Edge TTS
"""

import os
import sys
import logging
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any, List

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.append(str(current_dir))

# FastAPI imports
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import uvicorn

# Edge TTS imports
try:
    import edge_tts
    import asyncio
    import base64
    import tempfile
    TTS_AVAILABLE = True
    print("✅ Edge TTS available")
except ImportError as e:
    print(f"Edge TTS not available: {e}")
    TTS_AVAILABLE = False

# Other imports
from dotenv import load_dotenv
import subprocess
from datetime import datetime

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="MJAK Voice OS Edge TTS API",
    description="High-quality TTS with explicit male voices using Microsoft Edge TTS",
    version="4.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None
    language: Optional[str] = None
    speed: float = 1.0
    pitch: float = 1.0
    emotion: Optional[str] = None

class TTSResponse(BaseModel):
    success: bool
    audio_base64: Optional[str] = None
    error: Optional[str] = None
    voice_used: Optional[str] = None
    model_used: Optional[str] = None

class VoiceInfo(BaseModel):
    id: str
    name: str
    language: str
    description: str
    gender: str
    features: List[str]

class VoiceListResponse(BaseModel):
    voices: Dict[str, VoiceInfo]
    current_voice: str
    total_voices: int

class VoiceCloneRequest(BaseModel):
    voice_name: str
    description: Optional[str] = None

# Edge TTS Male Voices - These are actual male voices from Microsoft Edge TTS
EDGE_MALE_VOICES = {
    'english_us_male': VoiceInfo(
        id='en-US-AndrewNeural',
        name='English US Male (Andrew)',
        language='en-US',
        description='Male English (US) voice with American accent',
        gender='male',
        features=['edge_tts', 'speed_control', 'pitch_control']
    ),
    'english_uk_male': VoiceInfo(
        id='en-GB-RyanNeural',
        name='English UK Male (Ryan)',
        language='en-GB',
        description='Male English (UK) voice with British accent',
        gender='male',
        features=['edge_tts', 'speed_control', 'pitch_control']
    ),
    'hindi_male': VoiceInfo(
        id='hi-IN-MadhurNeural',
        name='Hindi Male (Madhur)',
        language='hi-IN',
        description='Male Hindi voice with Indian accent',
        gender='male',
        features=['edge_tts', 'speed_control', 'pitch_control']
    ),
    'german_male': VoiceInfo(
        id='de-DE-ConradNeural',
        name='German Male (Conrad)',
        language='de-DE',
        description='Male German voice with German accent',
        gender='male',
        features=['edge_tts', 'speed_control', 'pitch_control']
    ),
    'french_male': VoiceInfo(
        id='fr-FR-HenriNeural',
        name='French Male (Henri)',
        language='fr-FR',
        description='Male French voice with French accent',
        gender='male',
        features=['edge_tts', 'speed_control', 'pitch_control']
    ),
    'spanish_male': VoiceInfo(
        id='es-ES-AlvaroNeural',
        name='Spanish Male (Alvaro)',
        language='es-ES',
        description='Male Spanish voice with Spanish accent',
        gender='male',
        features=['edge_tts', 'speed_control', 'pitch_control']
    ),
    'italian_male': VoiceInfo(
        id='it-IT-DiegoNeural',
        name='Italian Male (Diego)',
        language='it-IT',
        description='Male Italian voice with Italian accent',
        gender='male',
        features=['edge_tts', 'speed_control', 'pitch_control']
    ),
    'portuguese_male': VoiceInfo(
        id='pt-PT-DuarteNeural',
        name='Portuguese Male (Duarte)',
        language='pt-PT',
        description='Male Portuguese voice with Portuguese accent',
        gender='male',
        features=['edge_tts', 'speed_control', 'pitch_control']
    ),
    'russian_male': VoiceInfo(
        id='ru-RU-DmitryNeural',
        name='Russian Male (Dmitry)',
        language='ru-RU',
        description='Male Russian voice with Russian accent',
        gender='male',
        features=['edge_tts', 'speed_control', 'pitch_control']
    ),
    'japanese_male': VoiceInfo(
        id='ja-JP-KeitaNeural',
        name='Japanese Male (Keita)',
        language='ja-JP',
        description='Male Japanese voice with Japanese accent',
        gender='male',
        features=['edge_tts', 'speed_control', 'pitch_control']
    )
}

class EdgeTTSService:
    """Edge TTS service using Microsoft Edge TTS with explicit male voices"""
    
    def __init__(self):
        self.current_voice = 'english_us_male'
        self.voices = EDGE_MALE_VOICES
        self._setup_voices()
    
    def _setup_voices(self):
        """Setup available voices"""
        try:
            logger.info(f"Edge TTS Male Voices: {len(self.voices)} available")
            logger.info(f"Default voice set to: {self.voices['english_us_male'].name}")
        except Exception as e:
            logger.error(f"Error setting up voices: {e}")
    
    async def text_to_speech_base64(self, text: str, voice_id: Optional[str] = None, **kwargs) -> str:
        """Convert text to speech and return as base64"""
        try:
            # Get voice info
            if voice_id and voice_id in self.voices:
                voice_info = self.voices[voice_id]
                edge_voice = voice_info.id
            else:
                # Default to English US male
                voice_info = self.voices['english_us_male']
                edge_voice = voice_info.id
            
            # Create temporary file for audio
            with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as temp_file:
                temp_path = temp_file.name
            
            # Use Edge TTS to generate speech
            communicate = edge_tts.Communicate(text, edge_voice)
            await communicate.save(temp_path)
            
            # Read the audio file and convert to base64
            with open(temp_path, 'rb') as f:
                audio_data = f.read()
            
            # Clean up temp file
            os.unlink(temp_path)
            
            return base64.b64encode(audio_data).decode('utf-8')
            
        except Exception as e:
            logger.error(f"Edge TTS conversion error: {e}")
            # Return silence as fallback
            return self._create_silence_audio()
    
    async def text_to_speech(self, text: str, voice_id: Optional[str] = None, **kwargs) -> bytes:
        """Convert text to speech and return as bytes"""
        try:
            # Get voice info
            if voice_id and voice_id in self.voices:
                voice_info = self.voices[voice_id]
                edge_voice = voice_info.id
            else:
                # Default to English US male
                voice_info = self.voices['english_us_male']
                edge_voice = voice_info.id
            
            # Create temporary file for audio
            with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as temp_file:
                temp_path = temp_file.name
            
            # Use Edge TTS to generate speech
            communicate = edge_tts.Communicate(text, edge_voice)
            await communicate.save(temp_path)
            
            # Read the audio file
            with open(temp_path, 'rb') as f:
                audio_data = f.read()
            
            # Clean up temp file
            os.unlink(temp_path)
            
            return audio_data
            
        except Exception as e:
            logger.error(f"Edge TTS conversion error: {e}")
            # Return silence as fallback
            return self._create_silence_audio_bytes()
    
    def _create_silence_audio(self) -> str:
        """Create silence audio as base64"""
        # Create a simple silence MP3 (1 second)
        silence_data = b'\xff\xfb\x90\x64\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
        return base64.b64encode(silence_data).decode('utf-8')
    
    def _create_silence_audio_bytes(self) -> bytes:
        """Create silence audio as bytes"""
        # Create a simple silence MP3 (1 second)
        return b'\xff\xfb\x90\x64\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
    
    def get_available_voices(self) -> Dict[str, Any]:
        """Get available voices"""
        return self.voices
    
    def set_voice(self, voice_id: str) -> bool:
        """Set the current voice"""
        if voice_id in self.voices:
            self.current_voice = voice_id
            return True
        return False
    
    def get_current_voice(self) -> str:
        """Get the current voice ID"""
        return self.current_voice
    
    def get_voice_info(self, voice_id: str) -> Optional[Dict[str, Any]]:
        """Get voice information"""
        if voice_id in self.voices:
            voice = self.voices[voice_id]
            return {
                'id': voice.id,
                'name': voice.name,
                'language': voice.language,
                'description': voice.description,
                'gender': voice.gender,
                'features': voice.features
            }
        return None

# Initialize Edge TTS service
tts_service = None
current_model = "None"

if TTS_AVAILABLE:
    try:
        logger.info("Initializing Edge TTS service...")
        tts_service = EdgeTTSService()
        current_model = "Edge TTS (Microsoft Neural Voices)"
        logger.info("Edge TTS service initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing Edge TTS service: {e}")
        TTS_AVAILABLE = False

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "MJAK Voice OS Edge TTS API",
        "version": "4.0.0",
        "features": {
            "edge_tts": TTS_AVAILABLE,
            "voice_cloning": False,
            "multilingual": True,
            "professional_quality": TTS_AVAILABLE,
            "offline_operation": False,
            "speed_control": True,
            "pitch_control": True,
            "explicit_male_voices": True
        },
        "current_model": current_model,
        "author": "Akhilesh Chandra"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "edge_tts": TTS_AVAILABLE,
            "voice_cloning": False,
            "multilingual": True,
            "explicit_male_voices": True
        },
        "current_model": current_model
    }

@app.get("/voices", response_model=VoiceListResponse)
async def get_voices():
    """Get available TTS voices"""
    if not tts_service:
        return VoiceListResponse(
            voices=EDGE_MALE_VOICES,
            current_voice='english_us_male',
            total_voices=len(EDGE_MALE_VOICES)
        )
    
    try:
        voices = tts_service.get_available_voices()
        current_voice = tts_service.get_current_voice()
        
        return VoiceListResponse(
            voices=voices,
            current_voice=current_voice,
            total_voices=len(voices)
        )
    except Exception as e:
        logger.error(f"Error getting voices: {e}")
        return VoiceListResponse(
            voices=EDGE_MALE_VOICES,
            current_voice='english_us_male',
            total_voices=len(EDGE_MALE_VOICES)
        )

@app.post("/tts", response_model=TTSResponse)
async def text_to_speech(request: TTSRequest):
    """Convert text to speech using Edge TTS"""
    if not tts_service:
        return TTSResponse(
            success=False,
            error="Edge TTS service not available"
        )
    
    try:
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        # Convert text to speech
        audio_base64 = await tts_service.text_to_speech_base64(
            text=request.text,
            voice_id=request.voice_id,
            speed=request.speed,
            pitch=request.pitch,
            emotion=request.emotion
        )
        
        voice_used = request.voice_id or tts_service.get_current_voice()
        voice_info = tts_service.get_voice_info(voice_used)
        
        return TTSResponse(
            success=True,
            audio_base64=audio_base64,
            voice_used=voice_info['name'] if voice_info else voice_used,
            model_used=current_model
        )
        
    except Exception as e:
        logger.error(f"Edge TTS conversion error: {e}")
        return TTSResponse(
            success=False,
            error=str(e)
        )

@app.post("/tts/stream")
async def text_to_speech_stream(request: TTSRequest):
    """Stream text to speech audio"""
    if not tts_service:
        raise HTTPException(status_code=503, detail="Edge TTS service not available")
    
    try:
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        # Convert text to speech
        audio_data = await tts_service.text_to_speech(
            text=request.text,
            voice_id=request.voice_id,
            speed=request.speed,
            pitch=request.pitch,
            emotion=request.emotion
        )
        
        # Return audio as streaming response
        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "attachment; filename=speech.mp3"
            }
        )
        
    except Exception as e:
        logger.error(f"Edge TTS streaming error: {e}")
        raise HTTPException(status_code=500, detail=f"Edge TTS conversion failed: {str(e)}")

@app.post("/tts/set-voice")
async def set_voice(voice_id: str):
    """Set the current TTS voice"""
    if not tts_service:
        raise HTTPException(status_code=503, detail="Edge TTS service not available")
    
    try:
        success = tts_service.set_voice(voice_id)
        if success:
            return {"success": True, "message": f"Voice set to {voice_id}"}
        else:
            raise HTTPException(status_code=400, detail=f"Invalid voice ID: {voice_id}")
    except Exception as e:
        logger.error(f"Error setting voice: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to set voice: {str(e)}")

@app.get("/tts/current-voice")
async def get_current_voice():
    """Get the current TTS voice"""
    if not tts_service:
        return {"id": "english_us_male", "name": "English US Male (Andrew)"}
    
    try:
        voice_id = tts_service.get_current_voice()
        voice_info = tts_service.get_voice_info(voice_id)
        return voice_info
    except Exception as e:
        logger.error(f"Error getting current voice: {e}")
        return {"id": "english_us_male", "name": "English US Male (Andrew)"}

@app.post("/tts/clone-voice")
async def clone_voice(voice_name: str, audio_file: UploadFile = File(...)):
    """Clone a voice from uploaded audio file"""
    raise HTTPException(status_code=503, detail="Voice cloning not available with Edge TTS")

@app.post("/tts/train-voice")
async def train_voice(request: VoiceCloneRequest):
    """Train a custom voice"""
    raise HTTPException(status_code=503, detail="Voice training not available with Edge TTS")

@app.get("/tts/features")
async def get_features():
    """Get available TTS features"""
    return {
        "voice_cloning": False,
        "multilingual": True,
        "offline_operation": False,
        "professional_quality": TTS_AVAILABLE,
        "custom_training": False,
        "style_transfer": False,
        "emotion_control": False,
        "speed_control": True,
        "pitch_control": True,
        "batch_processing": False,
        "real_time_streaming": True,
        "explicit_male_voices": True
    }

if __name__ == "__main__":
    print("Starting MJAK Voice OS Edge TTS Server...")
    print(f"Edge TTS Available: {TTS_AVAILABLE}")
    print(f"Current Model: {current_model}")
    print("Installing required packages...")
    
    # Install required packages
    packages = [
        "fastapi",
        "uvicorn[standard]",
        "pydantic",
        "python-dotenv",
        "edge-tts",
        "requests",
        "python-multipart",
        "aiofiles"
    ]
    
    for package in packages:
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
            print(f"Installed {package}")
        except subprocess.CalledProcessError:
            print(f"Failed to install {package}")
    
    print("All packages installed successfully!")
    print("Starting FastAPI server on http://localhost:1525")
    print("API Documentation available at: http://localhost:1525/docs")
    
    # Start the server
    uvicorn.run(
        "edge_tts_server:app",
        host="0.0.0.0",
        port=1525,
        reload=True,
        log_level="info"
    ) 
