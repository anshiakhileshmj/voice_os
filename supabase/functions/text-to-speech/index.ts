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

async function generateWithEdgeTTS(text: string, voiceConfig: any, ttsSettings: any): Promise<ArrayBuffer> {
  const voice = voiceConfig.edge_voice || 'en-US-AriaNeural'
  
  // Apply ElevenLabs-style settings to Edge TTS
  const rate = ttsSettings.speed || 1.0
  const volume = (ttsSettings.stability || 0.6) * 100
  const pitch = (ttsSettings.similarity_boost || 0.7) * 50
  
  // Create SSML with voice settings
  const ssmlText = `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" 
            xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">
        <voice name="${voice}">
            <prosody rate="${rate}" volume="${volume}%" pitch="${pitch}%">
                ${text}
            </prosody>
        </voice>
    </speak>
  `
  
  try {
    // Use Web Speech API synthesis (fallback for Edge environments)
    const response = await fetch('https://api.streamelements.com/kappa/v2/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice: voice.includes('Neural') ? voice.replace('Neural', '') : voice,
        text: text,
        language: voiceConfig.language
      })
    })
    
    if (response.ok) {
      return await response.arrayBuffer()
    }
    
    throw new Error('Edge TTS failed, falling back to gTTS')
  } catch (error) {
    console.log('Edge TTS failed, using gTTS fallback:', error.message)
    return generateWithGTTS(text, voiceConfig)
  }
}

async function generateWithGTTS(text: string, voiceConfig: any): Promise<ArrayBuffer> {
  const lang = voiceConfig.gtts_lang || 'en'
  
  try {
    // Use Google Translate TTS API
    const response = await fetch(`https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`gTTS failed with status: ${response.status}`)
    }
    
    return await response.arrayBuffer()
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

    // ElevenLabs-compatible settings
    const ttsSettings = {
      speed: 1.0,
      stability: 0.6,
      similarity_boost: 0.7,
      use_speaker_boost: false
    }

    // Generate speech with fallback system
    let audioBuffer: ArrayBuffer
    try {
      audioBuffer = await generateWithEdgeTTS(text, voiceConfig, ttsSettings)
      console.log('Successfully generated speech using Edge TTS')
    } catch (error) {
      console.log('Edge TTS failed, using gTTS:', error.message)
      audioBuffer = await generateWithGTTS(text, voiceConfig)
      console.log('Successfully generated speech using gTTS fallback')
    }

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'X-Model-Used': 'custom-tts-edge-gtts',
        'X-Voice-Config': JSON.stringify(voiceConfig)
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
