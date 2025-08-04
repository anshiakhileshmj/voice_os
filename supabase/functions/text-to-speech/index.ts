
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Voice configurations matching your custom TTS system from the dropdown
const VOICE_CONFIGS = {
  'female-en-us': {
    language: 'en', 
    gender: 'female', 
    accent: 'us',
    edge_voice: 'en-US-AriaNeural',
    gtts_lang: 'en'
  },
  'male-en-us': {
    language: 'en', 
    gender: 'male', 
    accent: 'us',
    edge_voice: 'en-US-GuyNeural',
    gtts_lang: 'en'
  },
  'female-en-uk': {
    language: 'en', 
    gender: 'female', 
    accent: 'uk',
    edge_voice: 'en-GB-SoniaNeural',
    gtts_lang: 'en'
  },
  'male-en-uk': {
    language: 'en', 
    gender: 'male', 
    accent: 'uk',
    edge_voice: 'en-GB-RyanNeural',
    gtts_lang: 'en'
  },
  'female-hindi': {
    language: 'hi', 
    gender: 'female',
    edge_voice: 'hi-IN-SwaraNeural',
    gtts_lang: 'hi'
  },
  'male-hindi': {
    language: 'hi', 
    gender: 'male',
    edge_voice: 'hi-IN-MadhurNeural',
    gtts_lang: 'hi'
  },
  'male-german': {
    language: 'de', 
    gender: 'male',
    edge_voice: 'de-DE-ConradNeural',
    gtts_lang: 'de'
  },
  'female-german': {
    language: 'de', 
    gender: 'female',
    edge_voice: 'de-DE-KatjaNeural',
    gtts_lang: 'de'
  },
  'female-french': {
    language: 'fr', 
    gender: 'female',
    edge_voice: 'fr-FR-DeniseNeural',
    gtts_lang: 'fr'
  },
  'male-french': {
    language: 'fr', 
    gender: 'male',
    edge_voice: 'fr-FR-HenriNeural',
    gtts_lang: 'fr'
  },
}

async function generateWithGTTS(text: string, voiceConfig: any): Promise<ArrayBuffer> {
  const lang = voiceConfig.gtts_lang || 'en'
  
  try {
    // Use a more reliable TTS endpoint
    const response = await fetch(`https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob&ttsspeed=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`gTTS failed with status: ${response.status}`)
    }
    
    const buffer = await response.arrayBuffer()
    console.log(`Generated TTS audio: ${buffer.byteLength} bytes`)
    
    return buffer
  } catch (error) {
    console.error('gTTS generation failed:', error)
    throw new Error(`TTS generation failed: ${error.message}`)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, voiceId, modelId } = await req.json()

    if (!text) {
      throw new Error('Text is required')
    }

    console.log('Converting text to speech using custom TTS:', { 
      text: text.substring(0, 50) + '...', 
      voiceId, 
      modelId 
    })

    // Get voice configuration - default to female-en-us if not found
    const voiceConfig = VOICE_CONFIGS[voiceId] || VOICE_CONFIGS['female-en-us']

    // Generate speech using Google TTS (more reliable)
    const audioBuffer = await generateWithGTTS(text, voiceConfig)

    console.log(`Successfully generated TTS audio: ${audioBuffer.byteLength} bytes`)

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'X-Model-Used': 'custom-tts-gtts',
        'X-Voice-Config': JSON.stringify(voiceConfig),
        'Cache-Control': 'no-cache'
      },
    })
  } catch (error) {
    console.error('Text-to-speech error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
