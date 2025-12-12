import { supabase } from "@/integrations/supabase/client";
import { numericIdToUuid } from "@/lib/utils";

export interface QuestionOption {
  label: string;
  relatedSkills: string[];
  nextQuestionId?: string;
}

export interface Question {
  id: string;
  questionid: string;
  category: string;
  questiontext: string;
  options: QuestionOption[];
  order: number | null;
  isactive: boolean;
}

export interface UserTestResult {
  userId: string;
  answers: Array<{
    questionId: string;
    selectedLabel: string;
    relatedSkills: string[];
  }>;
  skillScores: Record<string, number>;
  topSkills: string[];
  completedAt: Date;
}

// Fetch all user answers for analysis
export const getUserTestAnswers = async (userId: string | number) => {
  const userIdStr = String(userId);

  // Try multiple user ID formats to handle different storage methods
  const userIdVariants = [
    numericIdToUuid(userIdStr), // Converted UUID format
    userIdStr, // Direct user ID (might already be UUID or string)
  ];

  // If userId is numeric, also try the numeric version
  const numericId = parseInt(userIdStr, 10);
  if (!isNaN(numericId) && numericId.toString() === userIdStr) {
    userIdVariants.push(numericIdToUuid(numericId));
  }

  console.log("🔍 getUserTestAnswers - Trying variants:", {
    originalUserId: userId,
    userIdStr,
    variants: userIdVariants,
  });

  // Try each variant
  for (const userIdVariant of userIdVariants) {
    try {
      const { data, error } = await supabase
        .from("usertestanswers")
        .select("*")
        .eq("userid", userIdVariant)
        .order("answeredat", { ascending: true });

      if (error) {
        console.warn(
          `⚠️ Error fetching with variant ${userIdVariant}:`,
          error.message
        );
        // Continue to next variant
        continue;
      }

      if (data && data.length > 0) {
        console.log(
          `✅ Found ${data.length} test answers for user ${userIdVariant}`
        );
        return data;
      } else {
        console.log(`ℹ️ No answers found for variant ${userIdVariant}`);
      }
    } catch (err) {
      console.warn(`⚠️ Exception with variant ${userIdVariant}:`, err);
      continue;
    }
  }

  // Last resort: try to get current user's answers using auth context
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser) {
      console.log("🔍 Trying with auth user ID:", authUser.id);
      const { data, error } = await supabase
        .from("usertestanswers")
        .select("*")
        .eq("userid", authUser.id)
        .order("answeredat", { ascending: true });

      if (!error && data && data.length > 0) {
        console.log(`✅ Found ${data.length} test answers using auth user ID`);
        return data;
      }
    }
  } catch (authErr) {
    console.warn("⚠️ Could not get auth user:", authErr);
  }

  console.log("❌ No test answers found with any variant");
  return [];
};

// Calculate skill scores from user answers
export const calculateSkillScores = (answers: unknown[]) => {
  const skillCounts: Record<string, number> = {};

  if (!answers || !Array.isArray(answers)) {
    console.error("Invalid answers array:", answers);
    return skillCounts;
  }

  answers.forEach((answer) => {
    // Handle both relatedSkills (from component) and relatedskills (from database)
    const skills = answer.relatedSkills || answer.relatedskills || [];

    if (Array.isArray(skills)) {
      skills.forEach((skill: string) => {
        if (skill && typeof skill === "string") {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        }
      });
    }
  });

  return skillCounts;
};

// Get top N skills for a user
export const getTopSkills = (
  skillScores: Record<string, number>,
  limit: number = 3
) => {
  return Object.entries(skillScores)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, limit)
    .map(([skill, score]) => ({ skill, score: score as number }));
};

// Generate skill-based recommendations
export const generateRecommendations = (topSkills: string[]) => {
  const recommendations: Record<
    string,
    { courses: string[]; jobs: string[]; description: string }
  > = {
    Developer: {
      description:
        "You show strong technical problem-solving abilities and enjoy building solutions.",
      courses: [
        "Full-Stack Development",
        "Data Structures & Algorithms",
        "Cloud Computing",
      ],
      jobs: ["Software Engineer", "Full-Stack Developer", "Backend Developer"],
    },
    Designer: {
      description: "You have a creative eye and enjoy visual problem-solving.",
      courses: ["UI/UX Design", "Graphic Design", "Design Systems"],
      jobs: ["UI/UX Designer", "Product Designer", "Visual Designer"],
    },
    Marketer: {
      description:
        "You excel at communication and understanding audience needs.",
      courses: ["Digital Marketing", "Content Strategy", "Analytics & Growth"],
      jobs: ["Digital Marketer", "Content Strategist", "Growth Manager"],
    },
    Analyst: {
      description: "You enjoy working with data and finding insights.",
      courses: ["Data Analysis", "Business Intelligence", "Statistics"],
      jobs: ["Data Analyst", "Business Analyst", "Research Analyst"],
    },
    Teacher: {
      description:
        "You have strong communication skills and enjoy helping others learn.",
      courses: [
        "Educational Technology",
        "Curriculum Design",
        "Learning Psychology",
      ],
      jobs: [
        "Training Specialist",
        "Content Creator",
        "Educational Consultant",
      ],
    },
    "Project Manager": {
      description:
        "You show leadership qualities and enjoy organizing and coordinating.",
      courses: ["Project Management", "Agile Methodologies", "Leadership"],
      jobs: ["Project Manager", "Product Manager", "Team Lead"],
    },
  };

  return topSkills.map((skill) => ({
    skill,
    ...(recommendations[skill] || {
      description: "You show potential in this area.",
      courses: [],
      jobs: [],
    }),
  }));
};

// Add a new question (admin function)
export const addQuestion = async (question: Omit<Question, "id">) => {
  const { data, error } = await supabase
    .from("dynamictestquestions")
    .insert([
      {
        questionid: question.questionid,
        category: question.category,
        questiontext: question.questiontext,
        options: question.options as Record<string, unknown>, // Cast to Json type
        order: question.order,
        isactive: question.isactive,
      },
    ])
    .select();

  if (error) {
    console.error("Error adding question:", error);
    throw error;
  }

  return data[0];
};

// Update a question (admin function)
export const updateQuestion = async (
  questionId: string,
  updates: Partial<Question>
) => {
  const updateData: Record<string, unknown> = { ...updates };

  // Cast options to Json type if present
  if (updateData.options) {
    updateData.options = updateData.options as Record<string, unknown>;
  }

  const { data, error } = await supabase
    .from("dynamictestquestions")
    .update(updateData)
    .eq("questionid", questionId)
    .select();

  if (error) {
    console.error("Error updating question:", error);
    throw error;
  }

  return data[0];
};

// Filter out soft skills and interests, keeping only hard/tech skills
export const filterHardSkills = (skills: string[]): string[] => {
  const softSkillKeywords = [
    "communication",
    "teamwork",
    "leadership",
    "problem solving",
    "critical thinking",
    "time management",
    "adaptability",
    "creativity",
    "collaboration",
    "emotional intelligence",
    "work ethic",
    "interpersonal",
    "negotiation",
    "presentation",
    "public speaking",
    "active listening",
    "empathy",
    "patience",
    "flexibility",
    "stress management",
    "conflict resolution",
    "decision making",
    "organization",
    "planning",
    "multitasking",
  ];

  return skills.filter((skill) => {
    const skillLower = skill.toLowerCase().trim();
    return !softSkillKeywords.some(
      (keyword) => skillLower.includes(keyword) || keyword.includes(skillLower)
    );
  });
};
