
import MJTextToSpeech from './index.js';
import fs from 'fs-extra';

async function testTTS() {
  console.log('🧪 Testing MJ-TTS...');
  
  const tts = new MJTextToSpeech();
  
  try {
    // Initialize
    console.log('1. Initializing TTS...');
    await tts.initialize();
    console.log('✅ Initialization complete');
    
    // Test voice list
    console.log('2. Getting available voices...');
    const voices = tts.getAvailableVoices();
    console.log('Available voices:', voices);
    
    // Test speech generation
    console.log('3. Generating test speech...');
    const testText = "Hello, this is a test of the MJ Text to Speech system. It supports English male voice.";
    
    const audioData = await tts.generateSpeech(testText, { voice: 'en-male' });
    console.log('✅ Speech generation complete');
    console.log('Audio data length:', audioData.audio.length);
    
    // Save test audio
    console.log('4. Saving test audio file...');
    const outputPath = await tts.saveAudioToFile(audioData.audio, 'test_output.wav');
    console.log('✅ Test audio saved to:', outputPath);
    
    console.log('🎉 All tests passed!');
    console.log('📁 Check the output folder for test_output.wav');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testTTS();
