
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import MJTextToSpeech from './index.js';
import fs from 'fs-extra';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize TTS
const tts = new MJTextToSpeech();
let isReady = false;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Storage for uploaded files
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Initialize TTS on startup
async function initializeTTS() {
  try {
    await tts.initialize();
    isReady = true;
    console.log('🚀 MJ-TTS Server is ready!');
  } catch (error) {
    console.error('Failed to initialize TTS:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    ready: isReady,
    timestamp: new Date().toISOString()
  });
});

// Get available voices
app.get('/voices', (req, res) => {
  if (!isReady) {
    return res.status(503).json({ error: 'TTS not ready' });
  }
  
  res.json({
    voices: tts.getAvailableVoices()
  });
});

// Generate speech from text
app.post('/generate', async (req, res) => {
  if (!isReady) {
    return res.status(503).json({ error: 'TTS not ready' });
  }

  try {
    const { text, voice = 'en-male', speed = 1.0, pitch = 1.0 } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > 1000) {
      return res.status(400).json({ error: 'Text too long. Maximum 1000 characters.' });
    }

    console.log(`Generating speech: "${text.substring(0, 50)}..."`);

    const audioData = await tts.generateSpeech(text, { voice, speed, pitch });
    
    // Save to temporary file
    const filename = `speech_${Date.now()}.wav`;
    const filepath = await tts.saveAudioToFile(audioData.audio, filename);

    // Read file and send as base64
    const audioBuffer = await fs.readFile(filepath);
    const audioBase64 = audioBuffer.toString('base64');

    // Cleanup temp file
    await fs.remove(filepath);

    res.json({
      success: true,
      audio: audioBase64,
      format: 'wav',
      duration: audioData.audio.length / 16000, // Approximate duration
      voice: voice
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate speech',
      details: error.message 
    });
  }
});

// Generate speech and return as audio file
app.post('/generate-file', async (req, res) => {
  if (!isReady) {
    return res.status(503).json({ error: 'TTS not ready' });
  }

  try {
    const { text, voice = 'en-male' } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const audioData = await tts.generateSpeech(text, { voice });
    
    // Convert to WAV buffer
    const wavBuffer = tts.convertToWAV(audioData.audio);

    res.set({
      'Content-Type': 'audio/wav',
      'Content-Disposition': 'attachment; filename="speech.wav"'
    });

    res.send(wavBuffer);

  } catch (error) {
    console.error('File generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate speech file',
      details: error.message 
    });
  }
});

// Batch generation endpoint
app.post('/generate-batch', async (req, res) => {
  if (!isReady) {
    return res.status(503).json({ error: 'TTS not ready' });
  }

  try {
    const { texts, voice = 'en-male' } = req.body;

    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ error: 'Texts array is required' });
    }

    if (texts.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 texts per batch' });
    }

    const results = [];

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      if (text && text.trim().length > 0) {
        try {
          const audioData = await tts.generateSpeech(text, { voice });
          const wavBuffer = tts.convertToWAV(audioData.audio);
          
          results.push({
            index: i,
            text: text,
            audio: wavBuffer.toString('base64'),
            success: true
          });
        } catch (error) {
          results.push({
            index: i,
            text: text,
            error: error.message,
            success: false
          });
        }
      }
    }

    res.json({
      success: true,
      results: results,
      total: results.length
    });

  } catch (error) {
    console.error('Batch generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate batch',
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🌐 MJ-TTS Server running on http://localhost:${PORT}`);
  console.log('📋 Available endpoints:');
  console.log('  GET  /health - Health check');
  console.log('  GET  /voices - Available voices');
  console.log('  POST /generate - Generate speech (JSON response)');
  console.log('  POST /generate-file - Generate speech (WAV file)');
  console.log('  POST /generate-batch - Batch generation');
  
  // Initialize TTS
  await initializeTTS();
});
