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
    const { message, conversationHistory = [] } = await req.json()

    if (!message) {
      throw new Error('Message is required')
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')
    if (!OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key not configured')
    }

    console.log('Processing LLM request with OpenRouter:', { message: message.substring(0, 50) + '...', historyLength: conversationHistory.length })

    // Prepare messages array with system prompt and limited conversation history
    // Keep only last 4 messages to reduce processing time
    const recentHistory = conversationHistory.slice(-4)
    
    const messages = [
      {
        role: 'system',
        content: `You are MJAK, an advanced voice-enabled AI assistant with comprehensive capabilities. You excel at:

🎵 MUSIC & ENTERTAINMENT:
- Spotify integration for music control and discovery
- Audio processing and music recommendations

🤖 AUTOMATION & CONTROL:
- Computer task automation (opening apps, file management, system control)
- Voice-activated commands for productivity
- Screenshot capture and system interaction

📄 DOCUMENT INTELLIGENCE:
- PDF processing, text extraction, and document analysis
- File summarization and content questions
- Document formatting and organization

🌍 LOCATION & CONTEXT AWARENESS:
- Real-time location services and timezone detection
- Personalized greetings based on location and time
- Context-aware responses

🗣️ VOICE INTERACTION:
- Natural speech recognition and text-to-speech
- Conversational AI with memory of context
- Voice-first user experience

Be conversational, helpful, and concise. Prioritize voice-friendly responses that work well with text-to-speech. Always acknowledge the user's context and provide actionable assistance. When possible, suggest voice commands they can use.`
      },
      ...recentHistory,
      {
        role: 'user',
        content: message
      }
    ]

    console.log('Sending request to OpenRouter with Google Gemini 2.0 Flash')
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mjak.ai',
        'X-Title': 'MJAK AI Assistant',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: messages,
        max_tokens: 150, // Keep responses concise for voice
        temperature: 0.7,
        top_p: 0.9,
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenRouter API error:', errorText)
      throw new Error(`OpenRouter API failed: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    const aiResponse = result.choices[0].message.content
    console.log('Success with OpenRouter Gemini:', aiResponse.substring(0, 50) + '...')
    
    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        updatedHistory: [
          ...conversationHistory,
          { role: 'user', content: message },
          { role: 'assistant', content: aiResponse }
        ]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )

  } catch (error) {
    console.error('LLM chat error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
