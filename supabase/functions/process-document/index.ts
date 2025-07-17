import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { documentId, action, question } = await req.json()
    
    if (!documentId || !action) {
      throw new Error('Document ID and action are required')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get document from database
    const { data: document, error: docError } = await supabase
      .from('document_uploads')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      throw new Error('Document not found')
    }

    let result = ''
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured')
    }

    // Use Google Gemini for PDF processing
    if (document.file_type === 'application/pdf' && document.file_content) {
      result = await processWithGemini(document.file_content, action, question, GEMINI_API_KEY)
    } else {
      // Fallback for text files
      const content = document.file_content || ''
      switch (action) {
        case 'summarize':
          result = await summarizeText(content)
          break
        case 'extract':
          result = content
          break
        case 'format':
          result = await formatText(content)
          break
        case 'question':
          if (!question) {
            throw new Error('Question is required for Q&A action')
          }
          result = await answerQuestion(content, question)
          break
        default:
          throw new Error('Invalid action')
      }
    }

    // Store Q&A interaction
    if (action === 'question') {
      await supabase
        .from('document_interactions')
        .insert({
          user_id: document.user_id,
          document_id: documentId,
          question: question || '',
          answer: result
        })
    }

    // Update processed content if not a question
    if (action !== 'question' && !document.processed_content) {
      await supabase
        .from('document_uploads')
        .update({ processed_content: result })
        .eq('id', documentId)
    }

    return new Response(
      JSON.stringify({ 
        result: result,
        action: action,
        filename: document.filename
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Document processing error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})

async function processWithGemini(fileContent: string, action: string, question?: string, apiKey?: string): Promise<string> {
  try {
    console.log('Processing with Gemini AI:', action)
    
    let prompt = ''
    switch (action) {
      case 'summarize':
        prompt = 'Please provide a comprehensive summary of this document, highlighting the key points, main topics, and important information.'
        break
      case 'extract':
        prompt = 'Extract all the text content from this document in a clean, readable format.'
        break
      case 'format':
        prompt = 'Format and clean up the text in this document, making it well-structured and easy to read.'
        break
      case 'question':
        prompt = question || 'What is this document about?'
        break
      default:
        prompt = 'Analyze this document and provide relevant information.'
    }

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'application/pdf',
                data: fileContent.split(',')[1] || fileContent // Remove data URL prefix if present
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 4096,
      }
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const result = data.candidates[0].content.parts[0].text
      console.log('Gemini processing successful')
      return result
    } else {
      throw new Error('No content generated by Gemini')
    }
  } catch (error) {
    console.error('Gemini processing error:', error)
    throw new Error(`Failed to process with Gemini: ${error.message}`)
  }
}

async function summarizeText(text: string): Promise<string> {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  if (sentences.length <= 3) return text
  
  const summary = sentences.slice(0, 3).join('. ') + '.'
  return `Summary: ${summary}\n\nKey points: ${extractKeyPoints(text)}`
}

async function formatText(text: string): Promise<string> {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n\n')
    .trim()
}

async function answerQuestion(content: string, question: string): Promise<string> {
  const questionLower = question.toLowerCase()
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
  
  const relevantSentences = sentences.filter(sentence => {
    const sentenceLower = sentence.toLowerCase()
    const questionWords = questionLower.split(/\s+/).filter(w => w.length > 3)
    return questionWords.some(word => sentenceLower.includes(word))
  })
  
  if (relevantSentences.length === 0) {
    return "I couldn't find specific information related to your question in the document."
  }
  
  return relevantSentences.slice(0, 2).join('. ').trim() + '.'
}

function extractKeyPoints(text: string): string {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const keyWords = ['important', 'key', 'main', 'primary', 'significant', 'crucial', 'essential']
  
  const keyPoints = sentences.filter(sentence => 
    keyWords.some(keyword => sentence.toLowerCase().includes(keyword))
  ).slice(0, 3)
  
  return keyPoints.length > 0 ? keyPoints.join('. ') : 'Main content extracted.'
}