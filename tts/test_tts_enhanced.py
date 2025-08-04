#!/usr/bin/env python3
"""
Enhanced TTS Testing Script
Tests the improved TTS system with retry logic and fallback
"""

import requests
import json
import time
import os

# Test configuration
TTS_API_URL = "http://localhost:8001"
TEST_TEXTS = {
    "en": "Hello, this is a test of our enhanced multilingual TTS system with retry logic and automatic fallback.",
    "hi": "नमस्ते, यह हमारे बेहतर मल्टीलिंगुअल TTS सिस्टम का टेस्ट है जिसमें रिट्राई लॉजिक और ऑटोमैटिक फॉलबैक है।",
    "de": "Hallo, dies ist ein Test unseres verbesserten mehrsprachigen TTS-Systems mit Wiederholungslogik und automatischem Fallback.",
    "fr": "Bonjour, ceci est un test de notre système TTS multilingue amélioré avec logique de nouvelle tentative et basculement automatique."
}

def test_health():
    """Test TTS service health"""
    print("🏥 Testing TTS Service Health...")
    try:
        response = requests.get(f"{TTS_API_URL}/api/tts/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health Check: {data['status']}")
            print(f"📊 Models Available: {data.get('models_available', {})}")
            print(f"🔧 Features: {data.get('features', {})}")
            return True
        else:
            print(f"❌ Health Check Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health Check Error: {e}")
        return False

def test_voices():
    """Test voice listing"""
    print("\n🎤 Testing Voice Listing...")
    try:
        response = requests.get(f"{TTS_API_URL}/api/tts/voices", timeout=10)
        if response.status_code == 200:
            data = response.json()
            voices = data.get('voices', [])
            print(f"✅ Found {len(voices)} voices")
            for voice in voices[:5]:  # Show first 5
                print(f"   - {voice['name']} ({voice['language']}) - {voice['primary_model']}")
            return True
        else:
            print(f"❌ Voice Listing Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Voice Listing Error: {e}")
        return False

def test_tts_generation(text: str, voice_id: str, language: str, test_name: str):
    """Test TTS generation with retry and fallback"""
    print(f"\n🔊 Testing {test_name}...")
    print(f"   Text: {text[:50]}...")
    print(f"   Voice: {voice_id}")
    
    # Test the main endpoint with automatic fallback
    try:
        response = requests.post(
            f"{TTS_API_URL}/api/tts/generate",
            json={
                "text": text,
                "voice_id": voice_id,
                "language": language,
                "use_fallback": True
            },
            timeout=30
        )
        
        if response.status_code == 200:
            # Save the audio file
            filename = f"test_{language}_enhanced.mp3"
            with open(filename, 'wb') as f:
                f.write(response.content)
            
            model_used = response.headers.get('X-Model-Used', 'unknown')
            file_size = len(response.content)
            
            print(f"✅ Generated: {filename} ({file_size} bytes)")
            print(f"   Model Used: {model_used}")
            return True
        else:
            print(f"❌ Generation Failed: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"   Error: {error_detail}")
            except:
                print(f"   Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Generation Error: {e}")
        return False

def test_direct_endpoints(text: str, voice_id: str, language: str):
    """Test direct endpoints as fallback"""
    print(f"\n🔄 Testing Direct Endpoints for {language}...")
    
    # Test Edge TTS directly
    try:
        response = requests.post(
            f"{TTS_API_URL}/api/tts/edge",
            json={
                "text": text,
                "voice_id": voice_id,
                "language": language
            },
            timeout=30
        )
        
        if response.status_code == 200:
            filename = f"test_{language}_edge_direct.mp3"
            with open(filename, 'wb') as f:
                f.write(response.content)
            print(f"✅ Edge TTS Direct: {filename} ({len(response.content)} bytes)")
        else:
            print(f"❌ Edge TTS Direct Failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Edge TTS Direct Error: {e}")
    
    # Test Google TTS directly
    try:
        response = requests.post(
            f"{TTS_API_URL}/api/tts/gtts",
            json={
                "text": text,
                "voice_id": voice_id,
                "language": language
            },
            timeout=30
        )
        
        if response.status_code == 200:
            filename = f"test_{language}_gtts_direct.mp3"
            with open(filename, 'wb') as f:
                f.write(response.content)
            print(f"✅ Google TTS Direct: {filename} ({len(response.content)} bytes)")
        else:
            print(f"❌ Google TTS Direct Failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Google TTS Direct Error: {e}")

def main():
    """Main test function"""
    print("🚀 Enhanced TTS System Testing")
    print("=" * 50)
    
    # Test health first
    if not test_health():
        print("❌ TTS service is not healthy. Please start the service first.")
        return
    
    # Test voice listing
    if not test_voices():
        print("❌ Voice listing failed.")
        return
    
    # Test TTS generation for each language
    test_cases = [
        ("en", "en-us-female-1", "English (US Female)"),
        ("hi", "hi-female-1", "Hindi (Female)"),
        ("de", "de-female-1", "German (Female)"),
        ("fr", "fr-female-1", "French (Female)")
    ]
    
    success_count = 0
    total_count = len(test_cases)
    
    for language, voice_id, test_name in test_cases:
        text = TEST_TEXTS.get(language, TEST_TEXTS["en"])
        
        # Test main endpoint with fallback
        if test_tts_generation(text, voice_id, language, test_name):
            success_count += 1
        
        # Test direct endpoints
        test_direct_endpoints(text, voice_id, language)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Summary")
    print("=" * 50)
    print(f"✅ Successful: {success_count}/{total_count}")
    print(f"❌ Failed: {total_count - success_count}/{total_count}")
    
    if success_count == total_count:
        print("🎉 All tests passed! TTS system is working perfectly.")
    elif success_count > 0:
        print("⚠️  Partial success. Some languages may have issues.")
    else:
        print("❌ All tests failed. Please check the TTS service.")
    
    print(f"\n📁 Check the generated .mp3 files to hear the results.")
    print(f"🔧 The enhanced system includes:")
    print(f"   - Automatic retry logic (3 attempts)")
    print(f"   - Fallback from Edge TTS to Google TTS")
    print(f"   - Timeout handling (15 seconds)")
    print(f"   - Enhanced error reporting")

if __name__ == "__main__":
    main() 