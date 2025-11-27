/**
 * Skill Extraction Utility
 * Extracts skills from job descriptions using AI
 */

export interface SkillExtractionResult {
  skills: string[];
  error?: string;
}

/**
 * Extracts skills from job description using AI
 * @param text - The job description text
 * @returns Promise with array of extracted skills
 */
export async function extractSkillsFromText(
  text: string
): Promise<SkillExtractionResult> {
  try {
    // Clean and prepare the text
    const cleanText = text.trim().replace(/\s+/g, " ");

    // If text is too short, return empty
    if (cleanText.length < 50) {
      return {
        skills: [],
      };
    }

    // Truncate text if it's too long
    const maxInputLength = 6000;
    let truncatedText = cleanText;
    if (cleanText.length > maxInputLength) {
      const lastSpace = cleanText.lastIndexOf(" ", maxInputLength);
      truncatedText =
        lastSpace > 0
          ? cleanText.substring(0, lastSpace) + "..."
          : cleanText.substring(0, maxInputLength);
    }

    // Try using AI API to extract skills
    try {
      const skills = await trySkillExtractionAPI(truncatedText);
      if (skills && skills.length > 0) {
        return {
          skills: skills,
        };
      }
    } catch (apiError) {
      console.log("API skill extraction failed:", apiError);
    }

    // Fallback to keyword-based extraction
    const keywordSkills = extractSkillsByKeywords(truncatedText);
    return {
      skills: keywordSkills,
    };
  } catch (error) {
    console.error("Error extracting skills:", error);
    // Fallback to keyword extraction
    const keywordSkills = extractSkillsByKeywords(text);
    return {
      skills: keywordSkills,
    };
  }
}

/**
 * Try to use AI API to extract skills
 * AI carefully analyzes and only extracts skills that are actually required
 */
async function trySkillExtractionAPI(
  text: string
): Promise<string[] | null> {
  // Try using DeepSeek API (free tier)
  try {
    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: `You are an expert job analyst. Your task is to carefully analyze the job description and extract ONLY the skills that are ACTUALLY REQUIRED for this position.

IMPORTANT GUIDELINES:
1. Only extract skills that are explicitly stated as required, necessary, or essential
2. Look for keywords like: "required", "must have", "essential", "necessary", "proficiency in", "experience with", "knowledge of", "familiarity with"
3. DO NOT extract skills that are:
   - Only mentioned in passing or as examples
   - Listed as "nice to have" or "preferred" (unless they're also required)
   - Mentioned in company description or benefits section
   - Generic terms like "communication" unless explicitly required
   - Skills mentioned in "what we offer" or similar sections

4. Extract both technical skills (programming languages, frameworks, tools, technologies) AND soft skills (if explicitly required)
5. Use standard, professional skill names (e.g., "JavaScript" not "JS", "React" not "React.js")
6. Group related skills appropriately (e.g., "Node.js" not separate "Node" and "js")
7. Return ONLY a JSON array of skill names, nothing else

Think carefully: Is this skill truly required, or just mentioned? Only include skills that candidates MUST have to qualify for this job.

Example output: ["JavaScript", "React", "Node.js", "TypeScript", "REST APIs", "Git", "Team Leadership"]`,
            },
            {
              role: "user",
              content: `Analyze this job description and extract ONLY the required skills:\n\n${text.substring(0, 6000)}`,
            },
          ],
          max_tokens: 800,
          temperature: 0.2, // Lower temperature for more accurate, focused extraction
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      
      // Try to parse as JSON array
      try {
        // Remove markdown code blocks if present
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const skills = JSON.parse(cleaned);
        if (Array.isArray(skills)) {
          return skills.filter((s) => typeof s === "string" && s.trim().length > 0);
        }
      } catch (parseError) {
        // If not JSON, try to extract from text
        const lines = content.split("\n").map((line: string) => line.trim()).filter(Boolean);
        const extracted: string[] = [];
        for (const line of lines) {
          // Remove list markers and extract skills
          const cleaned = line.replace(/^[-•*]\s*/, "").replace(/^\d+\.\s*/, "").trim();
          if (cleaned && cleaned.length < 50) {
            extracted.push(cleaned);
          }
        }
        if (extracted.length > 0) {
          return extracted;
        }
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Extract skills using keyword matching (fallback)
 */
function extractSkillsByKeywords(text: string): string[] {
  const lowerText = text.toLowerCase();
  const skills: Set<string> = new Set();

  // Common tech skills keywords
  const skillKeywords: Record<string, string[]> = {
    javascript: ["javascript", "js", "node.js", "nodejs", "react", "vue", "angular"],
    python: ["python", "django", "flask", "fastapi", "pandas", "numpy"],
    java: ["java", "spring", "spring boot", "maven", "gradle"],
    "c++": ["c++", "cpp", "c plus plus"],
    "c#": ["c#", "csharp", "dotnet", ".net", "asp.net"],
    go: ["go", "golang"],
    rust: ["rust"],
    php: ["php", "laravel", "symfony", "wordpress"],
    ruby: ["ruby", "rails", "ruby on rails"],
    swift: ["swift", "ios"],
    kotlin: ["kotlin", "android"],
    typescript: ["typescript", "ts"],
    html: ["html", "html5"],
    css: ["css", "css3", "sass", "scss", "tailwind", "bootstrap"],
    sql: ["sql", "mysql", "postgresql", "mongodb", "database", "nosql"],
    react: ["react", "reactjs", "react.js"],
    vue: ["vue", "vuejs", "vue.js"],
    angular: ["angular", "angularjs"],
    "node.js": ["node.js", "nodejs", "node"],
    express: ["express", "express.js"],
    django: ["django"],
    flask: ["flask"],
    spring: ["spring", "spring boot"],
    laravel: ["laravel"],
    rails: ["rails", "ruby on rails"],
    git: ["git", "github", "gitlab"],
    docker: ["docker", "containerization"],
    kubernetes: ["kubernetes", "k8s"],
    aws: ["aws", "amazon web services"],
    azure: ["azure", "microsoft azure"],
    gcp: ["gcp", "google cloud", "google cloud platform"],
    "machine learning": ["machine learning", "ml", "deep learning", "neural networks"],
    "data science": ["data science", "data analysis", "data analytics"],
    "project management": ["project management", "agile", "scrum", "kanban"],
    "ui/ux": ["ui/ux", "ui design", "ux design", "user interface", "user experience"],
    figma: ["figma"],
    photoshop: ["photoshop", "adobe photoshop"],
    illustrator: ["illustrator", "adobe illustrator"],
    communication: ["communication", "communication skills", "verbal communication"],
    leadership: ["leadership", "team leadership", "lead"],
    teamwork: ["teamwork", "collaboration", "team player"],
    "problem solving": ["problem solving", "problem-solving", "analytical"],
    "time management": ["time management", "organizational skills"],
  };

  // Check for each skill
  for (const [skill, keywords] of Object.entries(skillKeywords)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        skills.add(skill);
        break;
      }
    }
  }

  return Array.from(skills).sort();
}

