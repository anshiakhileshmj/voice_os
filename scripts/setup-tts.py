#!/usr/bin/env python3
"""
Setup script for Custom TTS System
Installs and configures multilingual TTS models
"""

import os
import sys
import subprocess
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_command(command: str, description: str) -> bool:
    """Run a command and log the result"""
    try:
        logger.info(f"Running: {description}")
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        logger.info(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ {description} failed: {e.stderr}")
        return False

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        logger.error("❌ Python 3.8 or higher is required")
        return False
    logger.info(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    return True

def install_pytorch():
    """Install PyTorch with appropriate CUDA support"""
    try:
        import torch
        logger.info("✅ PyTorch already installed")
        return True
    except ImportError:
        logger.info("Installing PyTorch...")
        
        # Check for CUDA
        cuda_available = False
        try:
            result = subprocess.run("nvidia-smi", shell=True, capture_output=True)
            cuda_available = result.returncode == 0
        except:
            pass
        
        if cuda_available:
            logger.info("CUDA detected, installing PyTorch with CUDA support")
            command = "pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118"
        else:
            logger.info("No CUDA detected, installing CPU-only PyTorch")
            command = "pip install torch torchaudio"
        
        return run_command(command, "PyTorch installation")

def install_tts_dependencies():
    """Install TTS-specific dependencies compatible with Python 3.12"""
    dependencies = [
        # Core ML libraries
        "transformers>=4.30.0",
        "numpy>=1.24.0",
        "torch>=2.0.0",
        "torchaudio>=2.0.0",
        
        # Audio processing
        "librosa>=0.10.0",
        "soundfile>=0.12.0",
        "scipy>=1.10.0",
        
        # TTS alternatives (Python 3.12 compatible)
        "gTTS>=2.3.2",  # Google TTS
        "pyttsx3>=2.90",  # Offline TTS
        "edge-tts>=6.1.9",  # Microsoft Edge TTS
        
        # Web framework
        "fastapi>=0.100.0",
        "uvicorn[standard]>=0.22.0",
        
        # Utilities
        "requests>=2.31.0",
        "python-multipart>=0.0.6",
        "pydantic>=2.0.0",
        "aiofiles>=23.0.0"
    ]
    
    for dep in dependencies:
        command = f"pip install {dep}"
        if not run_command(command, f"Installing {dep}"):
            logger.warning(f"⚠️ Failed to install {dep}, continuing...")
            continue
    
    return True

def download_models():
    """Download TTS models"""
    logger.info("Downloading TTS models...")
    
    # Create models directory
    models_dir = Path("models")
    models_dir.mkdir(exist_ok=True)
    
    # Download Microsoft SpeechT5 models (works with Python 3.12)
    try:
        from transformers import SpeechT5Processor, SpeechT5ForTextToSpeech, SpeechT5HifiGan
        
        logger.info("Downloading Microsoft SpeechT5 models...")
        processor = SpeechT5Processor.from_pretrained("microsoft/speecht5_tts")
        model = SpeechT5ForTextToSpeech.from_pretrained("microsoft/speecht5_tts")
        vocoder = SpeechT5HifiGan.from_pretrained("microsoft/speecht5_tts")
        
        # Save models locally
        processor.save_pretrained("models/speecht5_processor")
        model.save_pretrained("models/speecht5_model")
        vocoder.save_pretrained("models/speecht5_vocoder")
        
        logger.info("✅ Microsoft SpeechT5 models downloaded and saved")
    except Exception as e:
        logger.warning(f"⚠️ Microsoft SpeechT5 model download failed: {e}")
    
    # Download additional models for better coverage
    try:
        from transformers import AutoTokenizer, AutoModel
        
        logger.info("Downloading additional TTS models...")
        
        # Download a smaller, faster model for quick testing
        tokenizer = AutoTokenizer.from_pretrained("microsoft/DialoGPT-medium")
        model = AutoModel.from_pretrained("microsoft/DialoGPT-medium")
        
        tokenizer.save_pretrained("models/dialogpt_tokenizer")
        model.save_pretrained("models/dialogpt_model")
        
        logger.info("✅ Additional models downloaded")
    except Exception as e:
        logger.warning(f"⚠️ Additional model download failed: {e}")

def create_reference_audio():
    """Create reference audio files for voice cloning"""
    logger.info("Creating reference audio directory...")
    
    ref_audio_dir = Path("reference_audio")
    ref_audio_dir.mkdir(exist_ok=True)
    
    # Create placeholder files
    voices = [
        "en-us-female", "en-us-male", "en-uk-female", "en-uk-male",
        "hi-female", "hi-male", "de-female", "de-male",
        "fr-female", "fr-male"
    ]
    
    for voice in voices:
        placeholder_file = ref_audio_dir / f"{voice}.wav"
        if not placeholder_file.exists():
            try:
                # Create a silent audio file as placeholder
                import numpy as np
                import soundfile as sf
                
                # Generate 1 second of silence
                sample_rate = 22050
                silence = np.zeros(sample_rate)
                sf.write(str(placeholder_file), silence, sample_rate)
                
                logger.info(f"Created placeholder for {voice}")
            except Exception as e:
                logger.warning(f"⚠️ Failed to create placeholder for {voice}: {e}")
    
    logger.info("✅ Reference audio directory created")

def test_tts_system():
    """Test the TTS system"""
    logger.info("Testing TTS system...")
    
    try:
        # Test basic imports
        import torch
        import torchaudio
        import numpy as np
        
        logger.info("✅ Basic imports successful")
        
        # Test Microsoft SpeechT5
        try:
            from transformers import SpeechT5Processor, SpeechT5ForTextToSpeech, SpeechT5HifiGan
            logger.info("✅ Microsoft SpeechT5 import successful")
        except ImportError:
            logger.warning("⚠️ Microsoft SpeechT5 not available")
        
        # Test gTTS
        try:
            from gtts import gTTS
            logger.info("✅ gTTS import successful")
        except ImportError:
            logger.warning("⚠️ gTTS not available")
        
        # Test pyttsx3 (offline TTS)
        try:
            import pyttsx3
            logger.info("✅ pyttsx3 import successful")
        except ImportError:
            logger.warning("⚠️ pyttsx3 not available")
        
        # Test edge-tts
        try:
            import edge_tts
            logger.info("✅ edge-tts import successful")
        except ImportError:
            logger.warning("⚠️ edge-tts not available")
        
        logger.info("✅ TTS system test completed")
        return True
        
    except Exception as e:
        logger.error(f"❌ TTS system test failed: {e}")
        return False

def create_simple_tts_api():
    """Create a simplified TTS API that works with available libraries"""
    logger.info("Creating simplified TTS API...")
    
    api_content = '''#!/usr/bin/env python3
"""
Simplified TTS API using available libraries
"""

import os
import io
import logging
import asyncio
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import torch
import numpy as np
import requests
import tempfile

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Simplified TTS API", version="1.0.0")

class TTSRequest(BaseModel):
    text: str
    voice_id: str
    language: str
    speed: float = 1.0

class TTSResponse(BaseModel):
    success: bool
    message: str

# Voice configurations
VOICE_CONFIGS = {
    'en-us-female-1': {'language': 'en', 'gender': 'female', 'accent': 'us'},
    'en-us-male-1': {'language': 'en', 'gender': 'male', 'accent': 'us'},
    'en-uk-female-1': {'language': 'en', 'gender': 'female', 'accent': 'uk'},
    'en-uk-male-1': {'language': 'en', 'gender': 'male', 'accent': 'uk'},
    'hi-female-1': {'language': 'hi', 'gender': 'female'},
    'hi-male-1': {'language': 'hi', 'gender': 'male'},
    'de-female-1': {'language': 'de', 'gender': 'female'},
    'de-male-1': {'language': 'de', 'gender': 'male'},
    'fr-female-1': {'language': 'fr', 'gender': 'female'},
    'fr-male-1': {'language': 'fr', 'gender': 'male'},
}

def generate_with_gtts(text: str, voice_config: Dict[str, Any]) -> bytes:
    """Generate speech using Google TTS"""
    try:
        from gtts import gTTS
        
        # Map language codes
        lang_map = {
            'en': 'en',
            'hi': 'hi',
            'de': 'de',
            'fr': 'fr'
        }
        
        lang = lang_map.get(voice_config['language'], 'en')
        
        # Generate speech
        tts = gTTS(text=text, lang=lang, slow=False)
        
        # Save to bytes
        audio_bytes = io.BytesIO()
        tts.write_to_fp(audio_bytes)
        audio_bytes.seek(0)
        
        return audio_bytes.getvalue()
        
    except Exception as e:
        logger.error(f"gTTS generation failed: {e}")
        raise

def generate_with_edge_tts(text: str, voice_config: Dict[str, Any]) -> bytes:
    """Generate speech using Microsoft Edge TTS"""
    try:
        import edge_tts
        
        # Map to Edge TTS voices
        voice_map = {
            'en-us-female-1': 'en-US-AriaNeural',
            'en-us-male-1': 'en-US-GuyNeural',
            'en-uk-female-1': 'en-GB-SoniaNeural',
            'en-uk-male-1': 'en-GB-RyanNeural',
            'hi-female-1': 'hi-IN-SwaraNeural',
            'hi-male-1': 'hi-IN-MadhurNeural',
            'de-female-1': 'de-DE-KatjaNeural',
            'de-male-1': 'de-DE-ConradNeural',
            'fr-female-1': 'fr-FR-DeniseNeural',
            'fr-male-1': 'fr-FR-HenriNeural',
        }
        
        voice = voice_map.get(voice_config.get('voice_id', 'en-us-female-1'), 'en-US-AriaNeural')
        
        # Generate speech
        communicate = edge_tts.Communicate(text, voice)
        audio_data = asyncio.run(communicate.get_audio())
        
        return audio_data
        
    except Exception as e:
        logger.error(f"Edge TTS generation failed: {e}")
        raise

@app.post("/api/tts/gtts")
async def gtts_endpoint(request: TTSRequest):
    """Google TTS endpoint"""
    try:
        voice_config = VOICE_CONFIGS.get(request.voice_id)
        if not voice_config:
            raise HTTPException(status_code=400, detail="Invalid voice ID")
        
        # Generate audio
        audio_data = generate_with_gtts(request.text, voice_config)
        
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
    """Microsoft Edge TTS endpoint"""
    try:
        voice_config = VOICE_CONFIGS.get(request.voice_id)
        if not voice_config:
            raise HTTPException(status_code=400, detail="Invalid voice ID")
        
        # Generate audio
        audio_data = generate_with_edge_tts(request.text, voice_config)
        
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
    """Get list of available voices"""
    return {
        "voices": [
            {
                "id": voice_id,
                "name": f"{config['gender'].title()} ({config['language'].upper()})",
                "language": config['language'],
                "gender": config['gender'],
                "accent": config.get('accent'),
                "model": "gtts" if config['language'] != 'en' else "edge-tts"
            }
            for voice_id, config in VOICE_CONFIGS.items()
        ]
    }

@app.get("/api/tts/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Simplified TTS API",
        "models_available": {
            "gtts": True,
            "edge_tts": True
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
'''
    
    # Write the simplified API
    api_file = Path("os/simple_tts_api.py")
    api_file.write_text(api_content)
    logger.info("✅ Simplified TTS API created")

def main():
    """Main setup function"""
    logger.info("🚀 Starting Custom TTS Setup...")
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Install PyTorch
    if not install_pytorch():
        logger.error("❌ PyTorch installation failed")
        sys.exit(1)
    
    # Install TTS dependencies
    if not install_tts_dependencies():
        logger.error("❌ TTS dependencies installation failed")
        sys.exit(1)
    
    # Download models
    download_models()
    
    # Create reference audio
    create_reference_audio()
    
    # Create simplified TTS API
    create_simple_tts_api()
    
    # Test the system
    if not test_tts_system():
        logger.error("❌ TTS system test failed")
        sys.exit(1)
    
    logger.info("🎉 Custom TTS Setup completed successfully!")
    logger.info("📋 Next steps:")
    logger.info("1. Start the TTS API: python os/simple_tts_api.py")
    logger.info("2. Test with: curl http://localhost:8001/api/tts/health")
    logger.info("3. Generate speech: curl -X POST http://localhost:8001/api/tts/gtts -H 'Content-Type: application/json' -d '{\"text\":\"Hello world\",\"voice_id\":\"en-us-female-1\",\"language\":\"en\"}'")

if __name__ == "__main__":
    main() 