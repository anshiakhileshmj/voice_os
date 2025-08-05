// Simple test to verify TTS is working
const testTTS = async () => {
  try {
    const response = await fetch('http://localhost:8001/api/tts/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: "Hello, this is a test of the enhanced TTS system.",
        voice_id: "en-us-female-1",
        language: "en",
        use_fallback: true,
        speed: 1.0,
        stability: 0.6,
        similarity_boost: 0.7,
        use_speaker_boost: false
      }),
    });

    if (response.ok) {
      console.log('✅ TTS test successful!');
      console.log('Model used:', response.headers.get('X-Model-Used'));
      console.log('Settings:', response.headers.get('X-TTS-Settings'));
      
      // Create audio element and play
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        console.log('✅ Audio playback completed');
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = (error) => {
        console.error('❌ Audio playback error:', error);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
      console.log('🎵 Playing test audio...');
      
    } else {
      console.error('❌ TTS test failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ TTS test error:', error);
  }
};

// Run the test
testTTS(); 