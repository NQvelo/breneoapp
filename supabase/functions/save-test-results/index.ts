// supabase/functions/save-test-results/index.ts

import { createClient } from "@supabase/supabase-js";

// Initialize the Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Define the handler for the function
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Get the data from the request body
  const {
    userId,
    totalScore,
    totalQuestions,
    finalRole,
    techScorePerSkill,
    softScorePerSkill,
    careerAnswers,
  } = req.body;

  // Validate that a user ID is provided
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  // Insert the data into the 'skill_test_results' table
  const { data, error } = await supabase.from("skill_test_results").insert([
    {
      user_id: userId,
      total_score: totalScore,
      total_questions: totalQuestions,
      final_role: finalRole,
      tech_score_per_skill: techScorePerSkill,
      soft_score_per_skill: softScorePerSkill,
      career_answers: careerAnswers,
    },
  ]);

  // Handle any errors from the database insertion
  if (error) {
    console.error("Error inserting data:", error);
    return res.status(500).json({ error: "Failed to save test results" });
  }

  // Return a success message
  return res.status(200).json({ message: "Test results saved successfully" });
}
