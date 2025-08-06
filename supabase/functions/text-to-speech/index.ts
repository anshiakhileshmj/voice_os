
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

    // Convert rate and pitch to numeric values
    // Rate: "0%" -> 1.0, "+20%" -> 1.2, "-10%" -> 0.9
    let speedValue = 1.0;
    if (rate && typeof rate === 'string') {
      const rateMatch = rate.match(/([+-]?\d+)%/);
      if (rateMatch) {
        const percentage = parseInt(rateMatch[1]);
        speedValue = 1.0 + (percentage / 100);
      }
    }

    // Pitch: "0Hz" -> 1.0, "+50Hz" -> 1.5, "-25Hz" -> 0.75
    let pitchValue = 1.0;
    if (pitch && typeof pitch === 'string') {
      const pitchMatch = pitch.match(/([+-]?\d+)Hz/);
      if (pitchMatch) {
        const hertz = parseInt(pitchMatch[1]);
        pitchValue = 1.0 + (hertz / 100); // Convert Hz to relative pitch
      }
    }

    // Call your Edge TTS server
    const response = await fetch('https://edge-tts-g3en.onrender.com/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.trim(),
        voice_id: voiceId || 'english_us_male',
        speed: speedValue,
        pitch: pitchValue,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Edge TTS API error:', error)
      throw new Error(`Edge TTS API error: ${error}`)
    }

    const result = await response.json()
    
    if (!result.success || !result.audio_base64) {
      throw new Error('No audio data received from Edge TTS service')
    }

    console.log('Successfully converted text to speech with Edge TTS')

    // Convert base64 to ArrayBuffer
    const binaryString = atob(result.audio_base64)
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
