#!/usr/bin/env python3
"""
Simple TTS Test Script
Tests the custom multilingual TTS system
"""

import requests
import json
import os

# TTS API base URL
BASE_URL = "http://localhost:8001"

def test_tts(text, voice_id, language, model="gtts"):
    """Test TTS with given parameters"""
    url = f"{BASE_URL}/api/tts/{model}"
    
    payload = {
        "text": text,
        "voice_id": voice_id,
        "language": language
    }
    
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            # Save audio file
            filename = f"test_{language}_{model}.mp3"
            with open(filename, 'wb') as f:
                f.write(response.content)
            print(f"✅ Generated: {filename} ({len(response.content)} bytes)")
            return True
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

def test_voices():
    """Test getting available voices"""
    try:
        response = requests.get(f"{BASE_URL}/api/tts/voices")
        if response.status_code == 200:
            voices = response.json()["voices"]
            print(f"✅ Available voices: {len(voices)}")
            for voice in voices:
                print(f"  - {voice['name']} ({voice['language']}) - {voice['model']}")
            return True
        else:
            print(f"❌ Error getting voices: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

def main():
    """Main test function"""
    print("🎤 Testing Custom Multilingual TTS System")
    print("=" * 50)
    
    # Test health check
    try:
        response = requests.get(f"{BASE_URL}/api/tts/health")
        if response.status_code == 200:
            health = response.json()
            print(f"✅ API Health: {health['status']}")
            print(f"   Models: {health['models_available']}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return
    
    print()
    
    # Test getting voices
    test_voices()
    print()
    
    # Test different languages
    tests = [
        # English tests
        {
            "text": "Hello, this is a test of our custom multilingual TTS system.",
            "voice_id": "en-us-female-1",
            "language": "en",
            "model": "gtts",
            "description": "English (Google TTS)"
        },
        {
            "text": "Hello, this is a test of our custom multilingual TTS system.",
            "voice_id": "en-us-female-1", 
            "language": "en",
            "model": "edge",
            "description": "English (Edge TTS)"
        },
        # Hindi test
        {
            "text": "नमस्ते, यह हमारे कस्टम मल्टीलिंगुअल TTS सिस्टम का टेस्ट है।",
            "voice_id": "hi-female-1",
            "language": "hi", 
            "model": "gtts",
            "description": "Hindi (Google TTS)"
        },
        # German test
        {
            "text": "Hallo, dies ist ein Test unseres mehrsprachigen TTS-Systems.",
            "voice_id": "de-female-1",
            "language": "de",
            "model": "edge", 
            "description": "German (Edge TTS)"
        },
        # French test
        {
            "text": "Bonjour, ceci est un test de notre systeme TTS multilingue.",
            "voice_id": "fr-female-1",
            "language": "fr",
            "model": "edge",
            "description": "French (Edge TTS)"
        }
    ]
    
    print("🧪 Running TTS Tests:")
    print("-" * 30)
    
    for i, test in enumerate(tests, 1):
        print(f"\n{i}. Testing {test['description']}")
        print(f"   Text: {test['text'][:50]}...")
        success = test_tts(test['text'], test['voice_id'], test['language'], test['model'])
        if success:
            print(f"   ✅ Success!")
        else:
            print(f"   ❌ Failed!")
    
    print("\n" + "=" * 50)
    print("🎉 TTS Testing Complete!")
    print("📁 Check the generated .mp3 files to hear the results.")

if __name__ == "__main__":
    main() 