
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [], useOpenRouter = false, model = 'meta-llama/llama-3.1-8b-instruct:free' } = await req.json();

    if (!message?.trim()) {
      throw new Error('Message is required');
    }

    let apiUrl: string;
    let apiKey: string;
    let requestBody: any;

    if (useOpenRouter) {
      // Use OpenRouter with better rate limits
      apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
      apiKey = Deno.env.get('OPENROUTER_API_KEY');
      
      if (!apiKey) {
        throw new Error('OpenRouter API key not configured');
      }

      requestBody = {
        model: model,
        messages: conversationHistory,
        stream: true,
        temperature: 0.7,
        max_tokens: 1000,
      };
    } else {
      // Fallback to Together AI
      apiUrl = 'https://api.together.xyz/v1/chat/completions';
      apiKey = Deno.env.get('TOGETHER_AI_API_KEY');
      
      if (!apiKey) {
        throw new Error('Together AI API key not configured');
      }

      requestBody = {
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        messages: conversationHistory,
        stream: true,
        temperature: 0.7,
        max_tokens: 1000,
      };
    }

    console.log(`Making request to ${useOpenRouter ? 'OpenRouter' : 'Together AI'} with model: ${model}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(useOpenRouter && {
          'HTTP-Referer': 'https://uasluhbtcpuigwkuslum.supabase.co',
          'X-Title': 'MJAK Voice AI'
        })
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${useOpenRouter ? 'OpenRouter' : 'Together AI'} API Error:`, response.status, errorText);
      
      // If OpenRouter fails, try Together AI as fallback
      if (useOpenRouter && response.status === 429) {
        console.log('OpenRouter rate limited, falling back to Together AI');
        const togetherApiKey = Deno.env.get('TOGETHER_AI_API_KEY');
        
        if (togetherApiKey) {
          const fallbackResponse = await fetch('https://api.together.xyz/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${togetherApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
              messages: conversationHistory,
              stream: true,
              temperature: 0.7,
              max_tokens: 1000,
            }),
          });
          
          if (fallbackResponse.ok) {
            return createStreamResponse(fallbackResponse);
          }
        }
      }
      
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
    }

    return createStreamResponse(response);

  } catch (error) {
    console.error('Streaming chat error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function createStreamResponse(response: Response): Response {
  // Create a transform stream to handle the response
  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data.trim() === '[DONE]') {
                controller.close();
                return;
              }
              
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            }
          }
        }
      } catch (error) {
        console.error('Stream processing error:', error);
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    }
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
