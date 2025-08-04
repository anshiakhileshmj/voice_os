#!/usr/bin/env python3
"""
Test script for enhanced TTS with ElevenLabs-style settings
"""

import requests
import json
import time

def test_enhanced_tts():
    """Test the enhanced TTS system with ElevenLabs-style settings"""
    
    base_url = "http://localhost:8001"
    
    print("🎤 Testing Enhanced TTS with ElevenLabs-style Settings")
    print("=" * 60)
    
    # Test 1: Health check
    print("\n1. Health Check:")
    try:
        response = requests.get(f"{base_url}/api/tts/health")
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ Status: {health_data['status']}")
            print(f"✅ Service: {health_data['service']}")
            print(f"✅ Models: {health_data['models_available']}")
            print(f"✅ Features: {health_data['features']}")
            print(f"✅ Voice Settings: {health_data['voice_settings']}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return
    
    # Test 2: Get available voices
    print("\n2. Available Voices:")
    try:
        response = requests.get(f"{base_url}/api/tts/voices")
        if response.status_code == 200:
            voices_data = response.json()
            for voice in voices_data['voices']:
                print(f"✅ {voice['name']} ({voice['language']}) - {voice['primary_model']}")
        else:
            print(f"❌ Voices request failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Voices error: {e}")
    
    # Test 3: TTS with default settings
    print("\n3. TTS with Default Settings:")
    test_text = "Hello, this is a test of the enhanced TTS system with default settings."
    
    default_settings = {
        "text": test_text,
        "voice_id": "en-us-female-1",
        "language": "en",
        "speed": 1.0,
        "stability": 0.6,
        "similarity_boost": 0.7,
        "use_speaker_boost": False
    }
    
    try:
        response = requests.post(f"{base_url}/api/tts/generate", json=default_settings)
        if response.status_code == 200:
            print("✅ Default TTS successful")
            print(f"✅ Model used: {response.headers.get('X-Model-Used', 'unknown')}")
            print(f"✅ Settings: {response.headers.get('X-TTS-Settings', 'unknown')}")
            
            # Save audio file
            with open("test_default_tts.mp3", "wb") as f:
                f.write(response.content)
            print("✅ Audio saved as 'test_default_tts.mp3'")
        else:
            print(f"❌ Default TTS failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Default TTS error: {e}")
    
    # Test 4: TTS with enhanced settings
    print("\n4. TTS with Enhanced Settings:")
    enhanced_settings = {
        "text": "This is a test with enhanced voice settings for better quality.",
        "voice_id": "en-us-female-1",
        "language": "en",
        "speed": 1.0,
        "stability": 0.8,  # Higher stability
        "similarity_boost": 0.9,  # Higher similarity
        "use_speaker_boost": True  # Enable speaker boost
    }
    
    try:
        response = requests.post(f"{base_url}/api/tts/generate", json=enhanced_settings)
        if response.status_code == 200:
            print("✅ Enhanced TTS successful")
            print(f"✅ Model used: {response.headers.get('X-Model-Used', 'unknown')}")
            print(f"✅ Settings: {response.headers.get('X-TTS-Settings', 'unknown')}")
            
            # Save audio file
            with open("test_enhanced_tts.mp3", "wb") as f:
                f.write(response.content)
            print("✅ Audio saved as 'test_enhanced_tts.mp3'")
        else:
            print(f"❌ Enhanced TTS failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Enhanced TTS error: {e}")
    
    # Test 5: TTS with fast settings
    print("\n5. TTS with Fast Settings:")
    fast_settings = {
        "text": "This is a quick test with fast voice settings.",
        "voice_id": "en-us-female-1",
        "language": "en",
        "speed": 1.2,  # Faster speed
        "stability": 0.5,  # Lower stability for speed
        "similarity_boost": 0.6,  # Lower similarity for speed
        "use_speaker_boost": False  # Disable for speed
    }
    
    try:
        response = requests.post(f"{base_url}/api/tts/generate", json=fast_settings)
        if response.status_code == 200:
            print("✅ Fast TTS successful")
            print(f"✅ Model used: {response.headers.get('X-Model-Used', 'unknown')}")
            print(f"✅ Settings: {response.headers.get('X-TTS-Settings', 'unknown')}")
            
            # Save audio file
            with open("test_fast_tts.mp3", "wb") as f:
                f.write(response.content)
            print("✅ Audio saved as 'test_fast_tts.mp3'")
        else:
            print(f"❌ Fast TTS failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Fast TTS error: {e}")
    
    # Test 6: Multilingual TTS
    print("\n6. Multilingual TTS Test:")
    languages = [
        ("en-us-female-1", "Hello, this is English TTS."),
        ("hi-female-1", "नमस्ते, यह हिंदी टीटीएस टेस्ट है।"),
        ("de-female-1", "Hallo, das ist ein deutscher TTS-Test."),
        ("fr-female-1", "Bonjour, c'est un test TTS français.")
    ]
    
    for voice_id, text in languages:
        try:
            settings = {
                "text": text,
                "voice_id": voice_id,
                "language": "en",
                "speed": 1.0,
                "stability": 0.7,
                "similarity_boost": 0.8,
                "use_speaker_boost": True
            }
            
            response = requests.post(f"{base_url}/api/tts/generate", json=settings)
            if response.status_code == 200:
                print(f"✅ {voice_id}: TTS successful")
                print(f"   Model: {response.headers.get('X-Model-Used', 'unknown')}")
                
                # Save audio file
                filename = f"test_{voice_id.replace('-', '_')}.mp3"
                with open(filename, "wb") as f:
                    f.write(response.content)
                print(f"   Audio saved as '{filename}'")
            else:
                print(f"❌ {voice_id}: TTS failed")
        except Exception as e:
            print(f"❌ {voice_id}: TTS error - {e}")
    
    print("\n" + "=" * 60)
    print("🎉 Enhanced TTS Testing Complete!")
    print("📁 Check the generated audio files to hear the differences:")
    print("   - test_default_tts.mp3")
    print("   - test_enhanced_tts.mp3")
    print("   - test_fast_tts.mp3")
    print("   - test_*_*.mp3 (multilingual files)")

if __name__ == "__main__":
    test_enhanced_tts() 