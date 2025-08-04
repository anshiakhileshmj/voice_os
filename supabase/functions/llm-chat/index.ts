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

    // Use fastest models first for better response times
    const FAST_MODELS = [
      'meta-llama/Llama-3.2-1B-Instruct-Turbo',  // Fastest
      'meta-llama/Llama-3.2-3B-Instruct-Turbo',  // Good balance
      'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO'
    ]

    const TOGETHER_AI_API_KEY = Deno.env.get('TOGETHER_AI_API_KEY')
    if (!TOGETHER_AI_API_KEY) {
      throw new Error('Together AI API key not configured')
    }

    console.log('Processing LLM request:', { message: message.substring(0, 50) + '...', historyLength: conversationHistory.length })

    // Keep only last 1 message to reduce processing time
    const recentHistory = conversationHistory.slice(-1)
    
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant. Give extremely brief responses in 5-10 words maximum. Be direct and concise.'
      },
      ...recentHistory,
      {
        role: 'user',
        content: message
      }
    ]

    // Try each model until one works
    let lastError = null
    for (const model of FAST_MODELS) {
      try {
        console.log(`Trying model: ${model}`)
        
        const response = await fetch('https://api.together.xyz/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${TOGETHER_AI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            max_tokens: 20, // Very small for faster responses
            temperature: 0.3, // Lower for more focused responses
            top_p: 0.7,
            stream: false,
            stop: ['.', '!', '?'], // Stop at first sentence
          }),
        })

        if (response.ok) {
          const result = await response.json()
          const aiResponse = result.choices[0].message.content.trim()
          console.log(`Success with model ${model}:`, aiResponse.substring(0, 50) + '...')
          
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
        } else {
          const errorText = await response.text()
          console.log(`Model ${model} failed:`, errorText)
          lastError = errorText
          continue
        }
      } catch (error) {
        console.log(`Model ${model} error:`, error)
        lastError = error
        continue
      }
    }

    // If all models failed, throw the last error
    throw new Error(`All models failed. Last error: ${lastError}`)

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
