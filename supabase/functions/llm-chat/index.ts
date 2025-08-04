
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

    // Use ONLY free models from Together AI - updated list of working free models
    const FREE_FAST_MODELS = [
      'meta-llama/Llama-3.2-3B-Instruct-Turbo',  // This one works from logs
      'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO',
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
      'microsoft/DialoGPT-medium'
    ]

    const TOGETHER_AI_API_KEY = Deno.env.get('TOGETHER_AI_API_KEY')
    if (!TOGETHER_AI_API_KEY) {
      throw new Error('Together AI API key not configured')
    }

    console.log('Processing LLM request:', { message: message.substring(0, 50) + '...', historyLength: conversationHistory.length })

    // Keep only last 2 messages for context but prevent loops
    const recentHistory = conversationHistory.slice(-2)
    
    const messages = [
      {
        role: 'system',
        content: `You are MJAK, an advanced voice-enabled AI assistant with comprehensive capabilities. You excel at:

🎵 MUSIC & ENTERTAINMENT:
- Spotify integration: Play songs, artists, playlists with voice commands
- Music discovery and recommendations
- Entertainment queries and discussions

🤖 AUTOMATION & CONTROL:
- Desktop automation: Open applications, control windows, take screenshots
- System tasks: File operations, typing automation, mouse control
- Voice-activated computer control for productivity

📄 DOCUMENT PROCESSING:
- PDF and text file analysis, summarization, and extraction
- Document formatting and organization
- Content analysis and Q&A about uploaded files

🌍 LOCATION & CONTEXT:
- Real-time location awareness and time zone support
- Personalized greetings based on user's location and time
- Weather and local information assistance

💬 CONVERSATIONAL AI:
- Natural, engaging conversations with context retention
- Multi-turn dialogue with conversation history
- Personalized responses based on user preferences

🔊 VOICE INTERACTION:
- Full voice-to-voice communication (speech-to-text and text-to-speech)
- Multiple language and voice options
- Hands-free operation for accessibility

COMMUNICATION STYLE:
- Be conversational, friendly, and helpful
- Keep responses concise but informative (aim for 1-3 sentences usually)
- Use natural language, avoid overly technical jargon
- Show enthusiasm for helping with tasks
- Acknowledge when you're performing actions (e.g., "Playing that song now!" or "Opening the application...")

IMPORTANT: Always respond in plain text. Only use JSON format when specifically requested to return structured data. Be direct and actionable in your responses.`
      },
      ...recentHistory,
      {
        role: 'user',
        content: message
      }
    ]

    // Try each free model until one works
    let lastError = null
    for (const model of FREE_FAST_MODELS) {
      try {
        console.log(`Trying free model: ${model}`)
        
        const response = await fetch('https://api.together.xyz/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${TOGETHER_AI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            max_tokens: 150, // Reasonable length for faster responses
            temperature: 0.7,
            top_p: 0.9,
            stream: false,
            stop: null, // Let it complete naturally
          }),
        })

        if (response.ok) {
          const result = await response.json()
          const aiResponse = result.choices[0].message.content.trim()
          console.log(`Success with free model ${model}:`, aiResponse.substring(0, 50) + '...')
          
          return new Response(
            JSON.stringify({ 
              response: aiResponse,
              modelUsed: model,
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
        } else {
          const errorText = await response.text()
          console.log(`Free model ${model} failed:`, errorText)
          lastError = errorText
          continue
        }
      } catch (error) {
        console.log(`Free model ${model} error:`, error)
        lastError = error
        continue
      }
    }

    // If all free models failed, throw error
    throw new Error(`All free models failed. Last error: ${lastError}`)

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
