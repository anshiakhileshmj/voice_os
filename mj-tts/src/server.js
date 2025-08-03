
import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import MJTextToSpeech from './index.js';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize TTS
let tts = null;

async function initializeTTS() {
  try {
    console.log('🚀 Starting MJ-TTS server...');
    tts = new MJTextToSpeech();
    await tts.initialize();
    console.log('✅ TTS engine ready');
  } catch (error) {
    console.error('❌ Failed to initialize TTS:', error);
    process.exit(1);
  }
}

// Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    initialized: tts?.isInitialized || false
  });
});

app.get('/voices', (req, res) => {
  if (!tts) {
    return res.status(503).json({ error: 'TTS not initialized' });
  }
  
  const voices = tts.getAvailableVoices();
  res.json({ voices });
});

app.post('/generate', async (req, res) => {
  if (!tts) {
    return res.status(503).json({ error: 'TTS not initialized' });
  }

  try {
    const { text, voice = 'en-male', speed = 1.0, pitch = 1.0 } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > 1000) {
      return res.status(400).json({ error: 'Text too long. Maximum 1000 characters.' });
    }

    const result = await tts.generateSpeech(text, { voice, speed, pitch });
    
    // Convert Float32Array to regular array for JSON serialization
    const audioArray = Array.from(result.audio);
    
    res.json({
      audio: audioArray,
      sampling_rate: result.sampling_rate,
      text,
      voice,
      duration: audioArray.length / result.sampling_rate
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/generate-file', async (req, res) => {
  if (!tts) {
    return res.status(503).json({ error: 'TTS not initialized' });
  }

  try {
    const { text, voice = 'en-male', speed = 1.0, pitch = 1.0 } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await tts.generateSpeech(text, { voice, speed, pitch });
    const filename = `tts_${Date.now()}.wav`;
    const filePath = await tts.saveAudioToFile(result.audio, filename);
    
    // Send the WAV file
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileBuffer = await fs.readFile(filePath);
    res.send(fileBuffer);
    
    // Clean up file after sending
    setTimeout(async () => {
      try {
        await fs.remove(filePath);
      } catch (e) {
        console.warn('Could not clean up temp file:', e.message);
      }
    }, 5000);

  } catch (error) {
    console.error('File generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/generate-batch', async (req, res) => {
  if (!tts) {
    return res.status(503).json({ error: 'TTS not initialized' });
  }

  try {
    const { texts, voice = 'en-male', speed = 1.0, pitch = 1.0 } = req.body;
    
    if (!texts || !Array.isArray(texts)) {
      return res.status(400).json({ error: 'Texts array is required' });
    }

    if (texts.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 texts per batch' });
    }

    const results = [];
    
    for (const text of texts) {
      if (text && text.trim()) {
        const result = await tts.generateSpeech(text.trim(), { voice, speed, pitch });
        results.push({
          text: text.trim(),
          audio: Array.from(result.audio),
          sampling_rate: result.sampling_rate,
          duration: result.audio.length / result.sampling_rate
        });
      }
    }

    res.json({
      results,
      total_count: results.length,
      voice,
      processing_time: Date.now()
    });

  } catch (error) {
    console.error('Batch generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
initializeTTS().then(() => {
  app.listen(port, () => {
    console.log(`🎤 MJ-TTS server running on http://localhost:${port}`);
    console.log(`📚 Available endpoints:`);
    console.log(`  GET  /health - Health check`);
    console.log(`  GET  /voices - Available voices`);
    console.log(`  POST /generate - Generate speech (JSON)`);
    console.log(`  POST /generate-file - Generate speech (WAV file)`);
    console.log(`  POST /generate-batch - Batch generation`);
  });
});
