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

    // Keep only last 4 messages to reduce processing time
    const recentHistory = conversationHistory.slice(-4)
    
    const messages = [
      {
        role: 'system',
        content: `You are MJAK, a friendly voice AI assistant. Keep responses brief and conversational for voice interaction.

🎵 MUSIC: "play bohemian rhapsody" → search and play on Spotify
🤖 AUTOMATION: "open notepad" → launch apps, take screenshots, control computer
📄 DOCUMENTS: "summarize this PDF" → extract text, answer questions about files
🌍 LOCATION: "what time is it" → current time and location info
🗣️ VOICE CHAT: Natural conversation with memory

Examples:
- "Hey MJAK, what's up?" → "Hey! I'm here and ready to help. What do you need?"
- "Play some music" → "I'll need to connect your Spotify first. Say 'connect Spotify' to get started."
- "Open calculator" → *launches calculator* "Calculator opened! Anything else?"
- "What time is it?" → "It's 2:30 PM in New York. How can I help you today?"

Be natural, helpful, and concise. Ask follow-up questions when needed. Always respond in a voice-friendly way.`
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
