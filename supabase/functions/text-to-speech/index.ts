
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, voiceId, rate, pitch } = await req.json()

    if (!text) {
      throw new Error('Text is required')
    }

    console.log('Converting text to speech with Edge TTS:', { 
      text: text.substring(0, 50) + '...', 
      voiceId, 
      rate, 
      pitch 
    })

    // Call your Edge TTS server
    const response = await fetch('https://edge-tts-g3en.onrender.com/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.trim(),
        voice: voiceId || 'english_us_male',
        rate: rate || '0%',
        pitch: pitch || '0Hz',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Edge TTS API error:', error)
      throw new Error(`Edge TTS API error: ${error}`)
    }

    const result = await response.json()
    
    if (!result.audio) {
      throw new Error('No audio data received from Edge TTS service')
    }

    console.log('Successfully converted text to speech with Edge TTS')

    // Convert base64 to ArrayBuffer
    const binaryString = atob(result.audio)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    return new Response(bytes.buffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/wav',
        'Content-Length': bytes.length.toString(),
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
