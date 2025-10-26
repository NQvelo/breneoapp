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
export const getUserTestAnswers = async (userId: string) => {
  const { data, error } = await supabase
    .from("usertestanswers")
    .select("*")
    .eq("userid", numericIdToUuid(userId))
    .order("answeredat", { ascending: true });

  if (error) {
    console.error("Error fetching user answers:", error);
    throw error;
  }

  return data;
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
