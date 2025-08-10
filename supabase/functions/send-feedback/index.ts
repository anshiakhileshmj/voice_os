
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FeedbackRequest {
  rating: number;
  feedback: string;
  timestamp: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rating, feedback, timestamp }: FeedbackRequest = await req.json();

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      throw new Error("Invalid rating. Must be between 1 and 5.");
    }

    if (!feedback || feedback.trim().length === 0) {
      throw new Error("Feedback text is required.");
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "MJAK Feedback <onboarding@resend.dev>",
      to: ["feedback@yourcompany.com"], // Replace with your email
      subject: `New User Feedback - ${rating}/5 Stars`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">
            New User Feedback Received
          </h1>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #6366f1; margin-top: 0;">Rating</h2>
            <p style="font-size: 24px; margin: 10px 0;">
              ${Array.from({ length: rating }, () => '⭐').join('')}
              ${Array.from({ length: 5 - rating }, () => '☆').join('')}
              (${rating}/5)
            </p>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #6366f1; margin-top: 0;">Feedback</h2>
            <p style="line-height: 1.6; white-space: pre-wrap;">${feedback}</p>
          </div>

          <div style="background: #e5e7eb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              <strong>Submitted:</strong> ${new Date(timestamp).toLocaleString()}
            </p>
          </div>

          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            This feedback was submitted through the MJAK AI Assistant application.
          </p>
        </div>
      `,
    });

    console.log("Feedback email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Feedback submitted successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-feedback function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
