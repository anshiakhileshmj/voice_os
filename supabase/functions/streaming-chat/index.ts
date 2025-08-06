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

    console.log('Processing streaming chat request:', { message: message.substring(0, 50) + '...', historyLength: conversationHistory.length })

    // Keep only last 6 messages to reduce processing time
    const recentHistory = conversationHistory.slice(-6)
    
    const messages = [
      {
        role: 'system',
        content: `You are MJAK, a friendly conversational AI assistant. You have natural, flowing conversations like a real person would.

Key traits:
- Be conversational and personable, not robotic
- Give concise but thoughtful responses (2-3 sentences max for most replies)
- Show personality and emotion in your responses
- Ask follow-up questions to keep conversations engaging
- Remember context from our conversation
- Be helpful while maintaining natural flow

Response style:
- "Hey! I'm doing great, thanks for asking. How's your day going?"
- "That sounds interesting! Tell me more about that."
- "I can definitely help with that. Let me think through this..."
- "Hmm, that's a good question. Here's what I think..."

Keep responses natural and conversational, like you're talking to a friend.`
      },
      ...recentHistory,
      {
        role: 'user',
        content: message
      }
    ]

    console.log('Sending streaming request to OpenRouter with Gemini 2.0 Flash')
    
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
        max_tokens: 200, // Keep responses concise for natural conversation
        temperature: 0.8,
        top_p: 0.9,
        stream: true, // Enable streaming
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenRouter API error:', errorText)
      throw new Error(`OpenRouter API failed: ${response.status} ${errorText}`)
    }

    // Create a ReadableStream for the response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        const decoder = new TextDecoder()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            controller.enqueue(new TextEncoder().encode(chunk))
          }
        } catch (error) {
          console.error('Streaming error:', error)
          controller.error(error)
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Streaming chat error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
