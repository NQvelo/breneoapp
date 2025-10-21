import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, sessionId, answer, questionNumber } = await req.json();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(
      "https://kwvpfetgerukuglqeuzl.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3dnBmZXRnZXJ1a3VnbHFldXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNDYzNjEsImV4cCI6MjA2NTgyMjM2MX0.oQNRxz5hNqp_YVkIJ0KOtVSgAksQ0km6iESqiWI8wHw",
      { auth: { persistSession: false } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      console.error("Authentication error:", authError);
      throw new Error("User not authenticated");
    }

    // Create service role client for database operations
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const serviceClient = createClient(
      "https://kwvpfetgerukuglqeuzl.supabase.co",
      serviceRoleKey!,
      { auth: { persistSession: false } }
    );

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    if (action === "start") {
      // Get the first question from the database
      const { data: questions, error: questionsError } = await serviceClient
        .from("dynamictestquestions")
        .select("*")
        .eq("isactive", true)
        .order("order", { ascending: true });

      if (questionsError) throw questionsError;
      if (!questions || questions.length === 0) {
        throw new Error("No active questions available");
      }

      const firstQuestion = questions[0];

      const { data: testSession, error } = await serviceClient
        .from("dynamic_skill_tests")
        .insert({
          user_id: user.id,
          session_data: {
            questions: [firstQuestion],
            answers: [],
            current_question: 1,
            status: "active",
            available_questions: questions,
          },
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          sessionId: testSession.id,
          question: firstQuestion.questiontext,
          questionNumber: 1,
          options: firstQuestion.options || null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "next") {
      // Get current session
      const { data: session, error: sessionError } = await serviceClient
        .from("dynamic_skill_tests")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .single();

      if (sessionError) throw sessionError;

      const sessionData = session.session_data;
      const questions = sessionData.questions || [];
      const answers = sessionData.answers || [];
      const availableQuestions = sessionData.available_questions || [];

      // Add the new answer
      answers.push(answer);

      if (questionNumber >= 5 || questionNumber >= availableQuestions.length) {
        console.log("Starting test completion process");

        // Generate final summary using OpenAI
        const conversationHistory = questions
          .map((q, i) => {
            const questionText = typeof q === "string" ? q : q.questiontext;
            return `Q${i + 1}: ${questionText}\nA${i + 1}: ${answers[i] || ""}`;
          })
          .join("\n\n");

        console.log("Conversation history created:", conversationHistory);

        const summaryPrompt = `Based on this skill assessment conversation, provide a comprehensive analysis of the user's strengths and suggested career paths. Format your response as JSON with this structure:
{
  "strengths": ["strength1", "strength2", "strength3"],
  "suggested_careers": ["career1", "career2", "career3"],
  "skill_gaps": ["gap1", "gap2"],
  "learning_recommendations": ["recommendation1", "recommendation2"],
  "summary": "A detailed paragraph summarizing the assessment"
}

Conversation:
${conversationHistory}`;

        console.log("About to call OpenAI API");

        const summaryResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a career assessment expert. Provide thoughtful, specific analysis based on the user responses.",
                },
                { role: "user", content: summaryPrompt },
              ],
              temperature: 0.7,
            }),
          }
        );

        console.log("OpenAI response status:", summaryResponse.status);

        if (!summaryResponse.ok) {
          const errorText = await summaryResponse.text();
          console.error("OpenAI API error:", errorText);
          throw new Error(
            `OpenAI API error: ${summaryResponse.status} - ${errorText}`
          );
        }

        const summaryData = await summaryResponse.json();
        console.log("OpenAI response data:", summaryData);

        const finalSummary = summaryData.choices[0].message.content;
        console.log("Final summary extracted:", finalSummary);

        // Update session with completion
        console.log("About to update database with completion");

        const { error: updateError } = await serviceClient
          .from("dynamic_skill_tests")
          .update({
            session_data: {
              ...sessionData,
              answers,
              status: "completed",
            },
            final_summary: finalSummary,
            completed_at: new Date().toISOString(),
          })
          .eq("id", sessionId);

        if (updateError) {
          console.error("Database update error:", updateError);
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        console.log("Test completion successful");

        return new Response(
          JSON.stringify({
            completed: true,
            summary: finalSummary,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get the next question from the available questions
      const nextQuestionIndex = questionNumber; // Since we start from 0-indexed
      if (nextQuestionIndex >= availableQuestions.length) {
        throw new Error("No more questions available");
      }

      const nextQuestionObj = availableQuestions[nextQuestionIndex];
      questions.push(nextQuestionObj);

      await serviceClient
        .from("dynamic_skill_tests")
        .update({
          session_data: {
            ...sessionData,
            questions,
            answers,
            current_question: questionNumber + 1,
          },
        })
        .eq("id", sessionId);

      return new Response(
        JSON.stringify({
          question: nextQuestionObj.questiontext,
          questionNumber: questionNumber + 1,
          options: nextQuestionObj.options || null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("Error in dynamic-skill-test function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
