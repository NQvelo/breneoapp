/**
 * Role Utilities
 * Functions to generate role summaries and required skills using AI
 */

/**
 * Generate an expanded, personalized summary for a role using AI
 * Similar style to "Your Recommended Career Path" - friendly and personalized
 * @param roleTitle - The job role title
 * @param userSkills - Array of user's top skills (optional)
 * @param matchPercentage - Match percentage for this role (optional)
 * @returns Promise with expanded role summary string
 */
export async function generateRoleSummary(
  roleTitle: string,
  userSkills?: string[],
  matchPercentage?: number
): Promise<string> {
  const skillsContext =
    userSkills && userSkills.length > 0
      ? `The user has strong skills in: ${userSkills.slice(0, 5).join(", ")}. `
      : "";

  const matchContext = matchPercentage
    ? `The user's skills match this role at about ${Math.round(
        matchPercentage
      )}%. `
    : "";

  // Retry logic - try up to 3 times to get a proper expanded summary
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
                content: `You are a friendly career advisor. Write a personalized, engaging EXPANDED summary about the **${roleTitle}** role in a conversational, encouraging tone similar to "Your Recommended Career Path" explanations.

CRITICAL: You MUST write a very detailed, expanded summary with 6-8 sentences. Do NOT write a short summary.

Style guidelines:
- Use simple, human-friendly language (like talking to a friend)
- Be encouraging and positive
- Use **bold** for the role name when first mentioned
- Write 6-8 detailed, comprehensive sentences (minimum 6 sentences)
- Make it feel personalized and relevant
- Be very specific about what the role involves
- Provide extensive detail about responsibilities, opportunities, and career growth

Include:
1. What makes **${roleTitle}** a great career path
2. What the role involves and why it's exciting
3. How it allows people to use their skills and grow
4. The opportunities and stability this career offers
5. Why it's a rewarding path

${skillsContext}${matchContext}Write in a warm, friendly tone that makes the reader excited about this career path. Make sure your response is at least 4 sentences long.`,
              },
              {
                role: "user",
                content: `Write a friendly, personalized VERY EXPANDED summary (6-8 sentences, minimum 6) about the **${roleTitle}** role that matches the style of "Your Recommended Career Path" explanations. Make it engaging, encouraging, and very detailed with extensive information.`,
              },
            ],
            max_tokens: 800,
            temperature: 0.8,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const summary = data.choices?.[0]?.message?.content || "";
        const trimmedSummary = summary.trim();

        // Validate that we got a proper expanded summary (not too short)
        if (trimmedSummary && trimmedSummary.length > 200) {
          // Check if it has multiple sentences (at least 4 periods or exclamation marks for expanded text)
          const sentenceCount = (trimmedSummary.match(/[.!?]/g) || []).length;
          if (sentenceCount >= 4) {
            return trimmedSummary;
          }
        }

        // If summary is too short, log and retry
        if (attempt < maxRetries) {
          console.warn(
            `Summary too short for ${roleTitle}, attempt ${attempt}/${maxRetries}, retrying...`
          );
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          continue;
        }

        // Last attempt - return what we got if it's not empty
        if (trimmedSummary) {
          return trimmedSummary;
        }
      } else {
        const errorText = await response.text().catch(() => "Unknown error");
        lastError = new Error(`API error: ${response.status} - ${errorText}`);
        if (attempt < maxRetries) {
          console.warn(
            `API error for ${roleTitle}, attempt ${attempt}/${maxRetries}, retrying...`
          );
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }
      }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.error(`Error generating role summary (attempt ${attempt}):`, e);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        continue;
      }
    }
  }

  // If all retries failed, return an expanded fallback (not the short placeholder)
  console.warn(
    `Failed to generate summary for ${roleTitle} after ${maxRetries} attempts, using expanded fallback`
  );
  return `**${roleTitle}** is an exciting and rewarding career path that offers tremendous opportunities for professional growth and personal fulfillment. This role allows you to work on meaningful projects that make a real impact, using your skills and creativity every day. As a ${roleTitle.toLowerCase()}, you'll have the chance to collaborate with talented teams, solve interesting challenges, and continuously learn new technologies and methodologies. The field is growing rapidly, with strong demand for skilled professionals, ensuring excellent job security and career advancement opportunities. Whether you're working on innovative projects, building user experiences, or solving complex problems, this career path offers both stability and the excitement of working at the forefront of your industry.`;
}

/**
 * Generate required skills for a role using DeepSeek AI
 * Generates comprehensive, role-specific skills including both technical and soft skills
 * @param roleTitle - The job role title
 * @returns Promise with array of required skills
 */
export async function generateRequiredSkills(
  roleTitle: string
): Promise<string[]> {
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
              content: `You are an expert job market analyst and career advisor. Generate a comprehensive list of the most important required skills for a ${roleTitle} position.

Requirements:
1. Include 15-20 comprehensive skills that are truly required for this role
2. Mix of technical/hard skills (60-70%) and soft/interpersonal skills (30-40%)
3. Use standard, professional skill names (e.g., "JavaScript" not "JS", "React" not "React.js")
4. Include both foundational skills and advanced/specialized skills relevant to ${roleTitle}
5. Make skills specific to this role - different roles should have different skill sets
6. Include industry-standard tools, technologies, and methodologies
7. Consider both entry-level and mid-level requirements
8. Include ALL important skills - be comprehensive and thorough

Return ONLY a JSON array of skill names, nothing else. No explanations, no markdown, just the array.

Example output format: ["JavaScript", "React", "Node.js", "TypeScript", "REST APIs", "Git", "Problem Solving", "Team Collaboration", "Agile Methodologies", "Code Review"]`,
            },
            {
              role: "user",
              content: `Generate a comprehensive list of required skills for a ${roleTitle} role. Include both technical and soft skills that are essential for success in this position. Return only a JSON array.`,
            },
          ],
          max_tokens: 800,
          temperature: 0.4,
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      // Try to parse as JSON array
      try {
        const cleaned = content
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        const skills = JSON.parse(cleaned);
        if (Array.isArray(skills)) {
          return skills.filter(
            (s) => typeof s === "string" && s.trim().length > 0
          );
        }
      } catch (parseError) {
        // If not JSON, try to extract from text
        const lines = content
          .split("\n")
          .map((line: string) => line.trim())
          .filter(Boolean);
        const extracted: string[] = [];
        for (const line of lines) {
          const cleaned = line
            .replace(/^[-•*]\s*/, "")
            .replace(/^\d+\.\s*/, "")
            .trim();
          if (cleaned && cleaned.length < 50) {
            extracted.push(cleaned);
          }
        }
        if (extracted.length > 0) {
          return extracted;
        }
      }
    }
  } catch (e) {
    console.error("Error generating required skills:", e);
  }

  // Fallback: return empty array or basic skills based on role title
  const roleLower = roleTitle.toLowerCase();
  if (roleLower.includes("developer") || roleLower.includes("engineer")) {
    return ["Programming", "Problem Solving", "Version Control", "Testing"];
  }
  if (roleLower.includes("designer") || roleLower.includes("design")) {
    return ["Design Thinking", "Prototyping", "User Research", "Visual Design"];
  }
  if (roleLower.includes("analyst") || roleLower.includes("data")) {
    return ["Data Analysis", "SQL", "Statistics", "Data Visualization"];
  }
  if (roleLower.includes("manager") || roleLower.includes("product")) {
    return [
      "Project Management",
      "Strategic Thinking",
      "Communication",
      "Agile",
    ];
  }

  return [];
}
