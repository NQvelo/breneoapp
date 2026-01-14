/**
 * Job Section Extractor Utility
 * Extracts and summarizes Responsibilities and Qualifications from job descriptions
 */

export interface ExtractionResult {
  content: string;
  error?: string;
}

/**
 * Extracts and summarizes Responsibilities from job description
 * Uses AI to identify and summarize key responsibilities, duties, and daily tasks
 */
export async function extractResponsibilities(
  jobDescription: string
): Promise<ExtractionResult> {
  try {
    const cleanText = jobDescription.trim().replace(/\s+/g, " ");

    if (cleanText.length < 50) {
      return {
        content: "No responsibilities information available.",
      };
    }

    // Try using AI API to extract responsibilities
    try {
      const responsibilities = await tryExtractResponsibilitiesAPI(cleanText);
      if (responsibilities && responsibilities.trim()) {
        return {
          content: formatResponsibilities(responsibilities.trim()),
        };
      }
    } catch (apiError) {
      console.log("API extraction failed:", apiError);
    }

    // Fallback to intelligent extraction
    const extracted = extractResponsibilitiesIntelligent(cleanText);
    return {
      content: formatResponsibilities(extracted),
    };
  } catch (error) {
    console.error("Error extracting responsibilities:", error);
    return {
      content: extractResponsibilitiesIntelligent(jobDescription),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Extracts and summarizes Qualifications from job description
 * Uses AI to identify and summarize required skills, experience, education, and qualifications
 */
export async function extractQualifications(
  jobDescription: string
): Promise<ExtractionResult> {
  try {
    const cleanText = jobDescription.trim().replace(/\s+/g, " ");

    if (cleanText.length < 50) {
      return {
        content: "No qualifications information available.",
      };
    }

    // Try using AI API to extract qualifications
    try {
      const qualifications = await tryExtractQualificationsAPI(cleanText);
      if (qualifications && qualifications.trim()) {
        return {
          content: formatQualifications(qualifications.trim()),
        };
      }
    } catch (apiError) {
      console.log("API extraction failed:", apiError);
    }

    // Fallback to intelligent extraction
    const extracted = extractQualificationsIntelligent(cleanText);
    return {
      content: formatQualifications(extracted),
    };
  } catch (error) {
    console.error("Error extracting qualifications:", error);
    return {
      content: extractQualificationsIntelligent(jobDescription),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Try to use AI API to extract responsibilities
 */
async function tryExtractResponsibilitiesAPI(
  text: string
): Promise<string | null> {
  try {
    const moveKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
    if (!moveKey) return null;

    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${moveKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: `You are a job description analyzer. Extract and summarize ONLY the RESPONSIBILITIES, DUTIES, and DAILY TASKS from the job description.

CRITICAL INSTRUCTIONS:
1. Make a single, clean list with bullet points.
2. Remove irrelevant sections such as legal notices, equal opportunity statements, privacy policies, pay transparency explanations, interview recording notices, and long salary disclaimers.
3. Merge duplicated sections (e.g., multiple "Responsibilities" headers) into one list.
4. Rewrite all extracted content in clear, simple, neutral English, without changing meaning.
5. Do NOT add new information that does not exist in the text.

FORMATTING:
- Start each item with "• " (bullet space).
- One item per line.
- Full sentences.

If no clear responsibilities are found, return "No specific responsibilities listed."`,
            },
            {
              role: "user",
              content: text.substring(0, 6000),
            },
          ],
          max_tokens: 800,
          temperature: 0.3,
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Try to use AI API to extract qualifications
 */
async function tryExtractQualificationsAPI(
  text: string
): Promise<string | null> {
  try {
    const moveKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
    if (!moveKey) return null;

    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${moveKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: `You are a job description analyzer. Extract and summarize ONLY the QUALIFICATIONS, REQUIREMENTS, SKILLS, and EDUCATION from the job description.

CRITICAL INSTRUCTIONS:
1. Make a single, clean list with bullet points.
2. Remove irrelevant sections such as legal notices, equal opportunity statements, privacy policies, pay transparency explanations, interview recording notices, and long salary disclaimers.
3. Merge duplicated sections (e.g., multiple "Required Qualifications" headers) into one list.
4. Rewrite all extracted content in clear, simple, neutral English, without changing meaning.
5. Do NOT add new information that does not exist in the text.

FORMATTING:
- Start each item with "• " (bullet space).
- One item per line.
- Full sentences.

If no clear qualifications are found, return "No specific qualifications listed."`,
            },
            {
              role: "user",
              content: text.substring(0, 6000),
            },
          ],
          max_tokens: 800,
          temperature: 0.3,
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Intelligent extraction of responsibilities using keyword matching
 */
function extractResponsibilitiesIntelligent(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  const responsibilityKeywords = [
    "responsibilities",
    "duties",
    "will",
    "will be",
    "will have",
    "primary",
    "main",
    "develop",
    "design",
    "manage",
    "create",
    "implement",
    "analyze",
    "collaborate",
    "lead",
    "work with",
    "handle",
    "ensure",
    "maintain",
    "build",
    "deliver",
    "support",
    "coordinate",
    "oversee",
    "execute",
    "perform",
    "conduct",
    "provide",
    "assist",
    "participate",
  ];

  const scoredSentences = sentences
    .map((sentence, index) => {
      const lowerSentence = sentence.toLowerCase();
      
      // Filter out legal/irrelevant text immediately
      if (
        /equal opportunity|affirmative action|privacy policy|click here|salary range|color, religion|sex, sexual orientation|gender identity|national origin|disability|veteran status|arrest history|background check/i.test(lowerSentence)
      ) {
        return { sentence: "", score: -100, index };
      }

      let score = 0;

      responsibilityKeywords.forEach((keyword) => {
        const regex = new RegExp(`\\b${keyword}\\b`, "gi");
        const matches = lowerSentence.match(regex);
        if (matches) {
          score += matches.length * 5;
        }
      });

      // Penalize sentences about requirements/qualifications
      if (
        /required|must have|qualification|experience|years|degree|education|certification|skill|proficient/i.test(
          lowerSentence
        ) &&
        !/will|responsibilities|duties/i.test(lowerSentence)
      ) {
        score -= 5;
      }

      // Penalize company/marketing fluff
      if (
        /company|organization|founded|established|mission|vision|values|culture|opportunity to|join us/i.test(
          lowerSentence
        )
      ) {
        score -= 3;
      }

      return { sentence: sentence.trim(), score, index };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // Sort back to original order
  scoredSentences.sort((a, b) => a.index - b.index);

  if (scoredSentences.length === 0) {
    return "No specific responsibilities listed in the job description.";
  }

  return scoredSentences.map((item) => item.sentence).join(" ");
}

/**
 * Intelligent extraction of qualifications using keyword matching
 */
function extractQualificationsIntelligent(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  const qualificationKeywords = [
    "required",
    "must have",
    "must",
    "need",
    "should have",
    "qualifications",
    "requirements",
    "experience",
    "years of",
    "degree",
    "education",
    "certification",
    "certified",
    "skills",
    "proficient",
    "expert",
    "knowledge",
    "familiar",
    "expect",
    "looking for",
    "candidate",
    "applicant",
    "ideal candidate",
    "minimum",
    "at least",
    "preferred",
    "bachelor",
    "master",
    "phd",
    "diploma",
  ];

  const scoredSentences = sentences
    .map((sentence, index) => {
      const lowerSentence = sentence.toLowerCase();

      // Filter out legal/irrelevant text immediately
      if (
        /equal opportunity|affirmative action|privacy policy|click here|salary range|color, religion|sex, sexual orientation|gender identity|national origin|disability|veteran status|arrest history|background check/i.test(lowerSentence)
      ) {
        return { sentence: "", score: -100, index };
      }

      let score = 0;

      qualificationKeywords.forEach((keyword) => {
        const regex = new RegExp(`\\b${keyword}\\b`, "gi");
        const matches = lowerSentence.match(regex);
        if (matches) {
          score += matches.length * 8;
        }
      });

      // Bonus for specific experience requirements
      if (
        /\d+\s*(year|years|yr|yrs|month|months)\s*(of|experience)/i.test(
          sentence
        )
      ) {
        score += 10;
      }

      // Bonus for specific technologies/skills
      if (
        /javascript|python|java|react|node|sql|typescript|html|css|angular|vue|spring|django|flask|express|mongodb|postgresql|mysql|aws|azure|docker|kubernetes|git|agile|scrum/i.test(
          sentence
        )
      ) {
        score += 6;
      }

      // Penalize sentences about responsibilities/duties
      if (
        /will|responsibilities|duties|develop|design|manage|create|implement|handle|ensure/i.test(
          lowerSentence
        ) &&
        !/required|must|qualification|experience|skill/i.test(lowerSentence)
      ) {
        score -= 5;
      }

      // Penalize company/marketing fluff
      if (
        /company|organization|founded|established|mission|vision|values|culture|opportunity to|join us/i.test(
          lowerSentence
        )
      ) {
        score -= 3;
      }

      return { sentence: sentence.trim(), score, index };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // Sort back to original order
  scoredSentences.sort((a, b) => a.index - b.index);

  if (scoredSentences.length === 0) {
    return "No specific qualifications listed in the job description.";
  }

  return scoredSentences.map((item) => item.sentence).join(" ");
}

/**
 * Extract skills from qualifications text
 */
export function extractSkillsFromQualifications(
  qualificationsText: string
): string[] {
  if (!qualificationsText || qualificationsText.length < 10) {
    return [];
  }

  const skills: Set<string> = new Set();
  const text = qualificationsText.toLowerCase();

  // Common technical skills patterns
  const techSkills = [
    "javascript",
    "typescript",
    "python",
    "java",
    "react",
    "angular",
    "vue",
    "node.js",
    "nodejs",
    "express",
    "django",
    "flask",
    "spring",
    "sql",
    "mongodb",
    "postgresql",
    "mysql",
    "aws",
    "azure",
    "docker",
    "kubernetes",
    "git",
    "html",
    "css",
    "sass",
    "scss",
    "tailwind",
    "bootstrap",
    "redux",
    "graphql",
    "rest api",
    "agile",
    "scrum",
    "ci/cd",
    "terraform",
    "jenkins",
    "linux",
    "unix",
    "php",
    "ruby",
    "go",
    "rust",
    "swift",
    "kotlin",
    "c++",
    "c#",
    ".net",
    "machine learning",
    "ai",
    "data science",
    "tableau",
    "power bi",
    "excel",
    "salesforce",
    "figma",
    "adobe",
    "photoshop",
    "illustrator",
  ];

  // Check for technical skills
  techSkills.forEach((skill) => {
    const regex = new RegExp(
      `\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "gi"
    );
    if (regex.test(text)) {
      // Capitalize properly
      const capitalized =
        skill.charAt(0).toUpperCase() +
        skill.slice(1).replace(/\b\w/g, (c) => c.toUpperCase());
      skills.add(capitalized);
    }
  });

  // Extract skills mentioned after common patterns
  const skillPatterns = [
    /(?:proficient|experienced|skilled|knowledge|expertise|familiar|strong)\s+(?:in|with|using)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    /(?:experience|knowledge)\s+(?:with|in|of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    /(?:must|should|required)\s+(?:have|be)\s+(?:experience|knowledge|skills?)\s+(?:in|with|using)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  ];

  skillPatterns.forEach((pattern) => {
    const matches = qualificationsText.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 2 && match[1].length < 50) {
        skills.add(match[1].trim());
      }
    }
  });

  // Extract from bullet points
  const bulletPoints = qualificationsText.split(/[•\-*]\s*/);
  bulletPoints.forEach((point) => {
    const trimmed = point.trim();
    // Look for skill mentions in bullet points
    techSkills.forEach((skill) => {
      const regex = new RegExp(
        `\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "gi"
      );
      if (regex.test(trimmed)) {
        const capitalized =
          skill.charAt(0).toUpperCase() +
          skill.slice(1).replace(/\b\w/g, (c) => c.toUpperCase());
        skills.add(capitalized);
      }
    });
  });

  return Array.from(skills).sort();
}

/**
 * Format responsibilities text for display
 */
function formatResponsibilities(text: string): string {
  // Ensure each bullet point is on a new line
  text = text.replace(/([^\n])([•\-*]\s+)/g, "$1\n$2");

  // Normalize bullet points to use •
  text = text.replace(/^[\s]*[-*]\s+/gm, "• ");

  // Ensure bullet points are properly separated
  text = text.replace(/([.!?])\s*([•]\s+)/g, "$1\n$2");
  text = text.replace(/(:)\s*([•]\s+)/g, "$1\n$2");

  // Split lines that have multiple bullet points
  text = text.replace(/([•]\s+[^\n•]+?)(\s+[•]\s+)/g, "$1\n$2");

  // Clean up multiple newlines but preserve single newlines between items
  text = text.replace(/\n{3,}/g, "\n\n");

  // Ensure each bullet point starts on its own line
  const lines = text.split("\n");
  const formattedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // If line starts with bullet, add it
    if (/^[•]\s+/.test(line)) {
      formattedLines.push(line);
    } else if (
      formattedLines.length > 0 &&
      !/^[•]/.test(formattedLines[formattedLines.length - 1])
    ) {
      // If previous line doesn't end with punctuation and this doesn't start with bullet, combine
      const prevLine = formattedLines[formattedLines.length - 1];
      if (!/[.!?]$/.test(prevLine)) {
        formattedLines[formattedLines.length - 1] = prevLine + " " + line;
      } else {
        formattedLines.push(line);
      }
    } else {
      formattedLines.push(line);
    }
  }

  return formattedLines.join("\n").trim();
}

/**
 * Format qualifications text for display
 */
function formatQualifications(text: string): string {
  // Ensure each bullet point is on a new line
  text = text.replace(/([^\n])([•\-*]\s+)/g, "$1\n$2");

  // Normalize bullet points to use •
  text = text.replace(/^[\s]*[-*]\s+/gm, "• ");

  // Ensure bullet points are properly separated
  text = text.replace(/([.!?])\s*([•]\s+)/g, "$1\n$2");
  text = text.replace(/(:)\s*([•]\s+)/g, "$1\n$2");

  // Split lines that have multiple bullet points
  text = text.replace(/([•]\s+[^\n•]+?)(\s+[•]\s+)/g, "$1\n$2");

  // Clean up multiple newlines but preserve single newlines between items
  text = text.replace(/\n{3,}/g, "\n\n");

  // Ensure each bullet point starts on its own line
  const lines = text.split("\n");
  const formattedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // If line starts with bullet, add it
    if (/^[•]\s+/.test(line)) {
      formattedLines.push(line);
    } else if (
      formattedLines.length > 0 &&
      !/^[•]/.test(formattedLines[formattedLines.length - 1])
    ) {
      // If previous line doesn't end with punctuation and this doesn't start with bullet, combine
      const prevLine = formattedLines[formattedLines.length - 1];
      if (!/[.!?]$/.test(prevLine)) {
        formattedLines[formattedLines.length - 1] = prevLine + " " + line;
      } else {
        formattedLines.push(line);
      }
    } else {
      formattedLines.push(line);
    }
  }

  return formattedLines.join("\n").trim();
}
