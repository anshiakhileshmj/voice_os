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

    // Try multiple free models in order of preference
    const FREE_MODELS = [
      'meta-llama/Llama-3.2-3B-Instruct-Turbo',
      'meta-llama/Llama-3.2-1B-Instruct-Turbo',
      'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO',
      'mistralai/Mixtral-8x7B-Instruct-v0.1'
    ]

    const TOGETHER_AI_API_KEY = Deno.env.get('TOGETHER_AI_API_KEY')
    if (!TOGETHER_AI_API_KEY) {
      throw new Error('Together AI API key not configured')
    }

    console.log('Processing LLM request:', { message: message.substring(0, 50) + '...', historyLength: conversationHistory.length })

    // Prepare messages array with system prompt and limited conversation history
    // Keep only last 2 messages to reduce processing time and stay within limits
    const recentHistory = conversationHistory.slice(-2)
    
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant. Give very concise responses in 1 sentence. Be brief and direct.'
      },
      ...recentHistory,
      {
        role: 'user',
        content: message
      }
    ]

    // Try each model until one works
    let lastError = null
    for (const model of FREE_MODELS) {
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
            max_tokens: 50, // Very small to avoid rate limits
            temperature: 0.7,
            top_p: 0.9,
            stream: false,
          }),
        })

        if (response.ok) {
          const result = await response.json()
          const aiResponse = result.choices[0].message.content
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