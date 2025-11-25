/**
 * AI Summarization Utility
 * Uses free AI APIs to summarize job descriptions
 */

export interface SummarizationResult {
  summary: string;
  error?: string;
}

/**
 * Summarizes text using free AI APIs
 * Creates a comprehensive, expanded summary focusing on what candidates need to know:
 * - Required skills, experience, and qualifications
 * - Key responsibilities and daily tasks
 * - What the employer expects from candidates
 * - Essential job details (location, type, benefits if mentioned)
 *
 * @param text - The text to summarize
 * @param maxLength - Maximum length of the summary in characters (default: 1200 for ~150-200 words)
 * @param minLength - Minimum length of the summary (default: 400)
 * @returns Promise with the summarized text formatted in paragraphs
 */
export async function summarizeText(
  text: string,
  maxLength: number = 1200,
  minLength: number = 400
): Promise<SummarizationResult> {
  try {
    // Clean and prepare the text
    const cleanText = text.trim().replace(/\s+/g, " ");

    // If text is too short, return as-is
    if (cleanText.length < 100) {
      return {
        summary: cleanText,
      };
    }

    // Truncate text if it's too long - allow more text for better context
    // Cut at word boundary to avoid cutting words
    const maxInputLength = 6000;
    let truncatedText = cleanText;
    if (cleanText.length > maxInputLength) {
      // Find the last space before maxInputLength to avoid cutting words
      const lastSpace = cleanText.lastIndexOf(" ", maxInputLength);
      truncatedText =
        lastSpace > 0
          ? cleanText.substring(0, lastSpace) + "..."
          : cleanText.substring(0, maxInputLength);
    }

    // Try using a free summarization API
    try {
      const summary = await trySummarizationAPI(truncatedText, maxLength);
      if (summary && summary.trim()) {
        // Format summary into paragraphs
        const formattedSummary = formatIntoParagraphs(summary.trim());
        return {
          summary: formattedSummary,
        };
      }
    } catch (apiError) {
      console.log("API summarization failed:", apiError);
    }

    // Use intelligent extractive summarization as fallback
    const intelligentSummary = generateIntelligentSummary(
      truncatedText,
      maxLength
    );
    // Format summary into paragraphs
    const formattedSummary = formatIntoParagraphs(intelligentSummary);
    return {
      summary: formattedSummary,
    };
  } catch (error) {
    console.error("Error summarizing text:", error);
    // Fallback to simple summary
    const cleanText = text.trim().replace(/\s+/g, " ");
    const maxInputLength = 6000;
    let truncatedText = cleanText;
    if (cleanText.length > maxInputLength) {
      // Find the last space before maxInputLength to avoid cutting words
      const lastSpace = cleanText.lastIndexOf(" ", maxInputLength);
      truncatedText =
        lastSpace > 0
          ? cleanText.substring(0, lastSpace) + "..."
          : cleanText.substring(0, maxInputLength);
    }

    const intelligentSummary = generateIntelligentSummary(
      truncatedText,
      maxLength
    );
    const formattedSummary = formatIntoParagraphs(intelligentSummary);
    return {
      summary: formattedSummary,
    };
  }
}

/**
 * Try to use a free summarization API
 * Uses multiple free services for reliability
 */
async function trySummarizationAPI(
  text: string,
  maxLength: number
): Promise<string | null> {
  // Try multiple free API services in sequence
  const apis = [
    // Try using Hugging Face new router endpoint (as user suggested)
    async () => {
      try {
        const response = await fetch(
          "https://router.huggingface.co/models/facebook/bart-large-cnn",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: text.substring(0, 4096),
              parameters: {
                max_length: Math.min(maxLength, 300),
                min_length: Math.floor(maxLength * 0.4),
                do_sample: false,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            return data[0]?.summary_text || data[0]?.generated_text || null;
          }
          return data.summary_text || data.generated_text || null;
        }
        return null;
      } catch (e) {
        return null;
      }
    },
    // Try using a smaller, faster model
    async () => {
      try {
        const response = await fetch(
          "https://router.huggingface.co/models/sshleifer/distilbart-cnn-12-6",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: text.substring(0, 4096),
              parameters: {
                max_length: Math.min(maxLength, 300),
                min_length: Math.floor(maxLength * 0.4),
                do_sample: false,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            return data[0]?.summary_text || data[0]?.generated_text || null;
          }
          return data.summary_text || data.generated_text || null;
        }
        return null;
      } catch (e) {
        return null;
      }
    },
    // Try using a free OpenAI-compatible API (DeepSeek - free tier)
    async () => {
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
                  content: `You are a job description summarizer. Create a COMPREHENSIVE, EXPANDED summary (approximately ${Math.floor(
                    maxLength / 6
                  )}-${Math.floor(
                    maxLength / 5
                  )} words, max ${maxLength} characters) that thoroughly tells candidates what they need to know. Focus on:

1) REQUIRED QUALIFICATIONS: Skills, experience (years), education, certifications - be specific and detailed. When listing multiple items, format them as a list with each item on a new line using bullet points (•) or dashes (-).
2) KEY RESPONSIBILITIES: Main daily tasks, duties, and responsibilities - include important details. Format lists of responsibilities with each item on a separate line.
3) CANDIDATE EXPECTATIONS: What the employer expects from ideal candidates, preferred qualities. Use lists when mentioning multiple expectations.
4) ESSENTIAL DETAILS: Work type (remote/hybrid/onsite), location if relevant, salary/benefits if mentioned, team structure.

IMPORTANT FORMATTING:
- Use bullet points (•) or dashes (-) for lists
- Put each list item on a new line
- Format numbered lists as: 1. Item, 2. Item (each on new line)
- Separate paragraphs with blank lines
- Keep lists within paragraphs but format items vertically

EXCLUDE: Company history, generic marketing language, fluff. Be direct, factual, and comprehensive. Format in 3-4 well-separated paragraphs for readability. Each paragraph should cover a distinct aspect. Ensure complete sentences and never cut words mid-sentence.`,
                },
                {
                  role: "user",
                  content: text.substring(0, 6000),
                },
              ],
              max_tokens: Math.floor(maxLength / 2.5), // More tokens for expanded summaries
              temperature: 0.3, // Slightly higher for more natural, comprehensive summaries
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
    },
  ];

  // Try each API in sequence
  for (const apiCall of apis) {
    try {
      const result = await apiCall();
      if (result && result.trim()) {
        return result.trim();
      }
    } catch (error) {
      console.log("API attempt failed:", error);
      continue;
    }
  }

  return null;
}

/**
 * Intelligent extractive summarization
 * Comprehensively extracts what candidates need to know:
 * - Required qualifications and experience
 * - Key responsibilities
 * - Candidate expectations
 * - Essential job details
 * Creates an expanded, comprehensive summary without cutting words
 */
function generateIntelligentSummary(text: string, maxLength: number): string {
  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  if (sentences.length <= 1) {
    // Cut at word boundary if needed
    if (text.length > maxLength) {
      const lastSpace = text.lastIndexOf(" ", maxLength);
      return lastSpace > 0
        ? text.substring(0, lastSpace)
        : text.substring(0, maxLength);
    }
    return text;
  }

  // Highest priority: Direct requirements and qualifications
  const requirementKeywords = [
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
  ];

  // High priority: Responsibilities and daily tasks
  const responsibilityKeywords = [
    "responsibilities",
    "duties",
    "will",
    "will be",
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
  ];

  // Medium priority: Technical details and tools
  const technicalKeywords = [
    "technical",
    "software",
    "programming",
    "language",
    "framework",
    "database",
    "api",
    "system",
    "tool",
    "technology",
    "platform",
    "stack",
  ];

  // Score sentences based on candidate-relevant information
  const scoredSentences = sentences.map((sentence, index) => {
    const lowerSentence = sentence.toLowerCase();
    let score = 0;

    // Highest priority: Direct requirements and qualifications
    requirementKeywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      const matches = lowerSentence.match(regex);
      if (matches) {
        score += matches.length * 8; // Very high weight for requirements
      }
    });

    // High priority: Responsibilities and tasks
    responsibilityKeywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      const matches = lowerSentence.match(regex);
      if (matches) {
        score += matches.length * 5;
      }
    });

    // Medium priority: Technical details
    technicalKeywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      const matches = lowerSentence.match(regex);
      if (matches) {
        score += matches.length * 3;
      }
    });

    // Very high bonus for sentences with specific experience requirements
    if (
      /\d+\s*(year|years|yr|yrs|month|months)\s*(of|experience)/i.test(sentence)
    ) {
      score += 10;
    }

    // High bonus for specific technologies/skills mentioned
    if (
      /javascript|python|java|react|node|sql|typescript|html|css|angular|vue|spring|django|flask|express|mongodb|postgresql|mysql|aws|azure|docker|kubernetes|git|agile|scrum/i.test(
        sentence
      )
    ) {
      score += 6;
    }

    // Bonus for work arrangement mentions
    if (
      /remote|hybrid|onsite|on-site|work from home|wfh|flexible/i.test(sentence)
    ) {
      score += 4;
    }

    // Bonus for salary/compensation mentions
    if (/salary|compensation|pay|benefits|bonus|equity|stock/i.test(sentence)) {
      score += 3;
    }

    // First few sentences often contain key info
    if (index < 3) score += 3;

    // Prefer concise sentences (40-120 chars) - more aggressive
    if (sentence.length >= 40 && sentence.length <= 120) {
      score += 2;
    }

    // Strongly penalize very long sentences and marketing fluff
    if (sentence.length > 200) {
      score -= 5;
    }

    // Penalize company history, generic descriptions, marketing language
    if (
      /company|organization|founded|established|mission|vision|values|culture|team|environment|opportunity to|join us|we are|we offer/i.test(
        lowerSentence
      ) &&
      !/work with|collaborate with|team of/i.test(lowerSentence)
    ) {
      score -= 3;
    }

    return { sentence: sentence.trim(), score, index };
  });

  // Sort by score (highest first)
  scoredSentences.sort((a, b) => b.score - a.score);

  // Select top sentences that fit within maxLength
  let summary = "";
  const selectedSentences: typeof scoredSentences = [];

  for (const item of scoredSentences) {
    if (item.score < 3) break; // Lower threshold for more comprehensive summaries

    const potentialSummary = summary
      ? summary + " " + item.sentence
      : item.sentence;

    if (potentialSummary.length <= maxLength) {
      summary = potentialSummary;
      selectedSentences.push(item);
    } else {
      // Don't cut words - just stop adding sentences when we reach the limit
      break;
    }
  }

  // Sort selected sentences back to original order for readability
  if (selectedSentences.length > 0) {
    selectedSentences.sort((a, b) => a.index - b.index);
    summary = selectedSentences.map((item) => item.sentence).join(" ");
  }

  // If no good summary was created, create a focused summary
  if (!summary || summary.length < 50) {
    summary = createFocusedSummary(sentences, maxLength);
  }

  // Clean up the summary
  summary = summary
    .replace(/\s+/g, " ") // Remove extra spaces
    .replace(/\s+([.!?])/g, "$1") // Remove space before punctuation
    .trim();

  // Fallback: if no summary, get text up to maxLength at word boundary
  if (!summary) {
    if (text.length > maxLength) {
      const lastSpace = text.lastIndexOf(" ", maxLength);
      summary =
        lastSpace > 0
          ? text.substring(0, lastSpace)
          : text.substring(0, maxLength);
    } else {
      summary = text;
    }
  }

  return summary;
}

/**
 * Create a focused summary by extracting key candidate-relevant information
 * Prioritizes requirements, responsibilities, and essential details
 */
function createFocusedSummary(sentences: string[], maxLength: number): string {
  const parts: string[] = [];

  // Priority 1: Requirements and qualifications (most important for candidates)
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (
      /required|must|qualification|experience|years|degree|skill|proficient|expert|certification|minimum|at least/i.test(
        lower
      ) &&
      !/company|organization|founded|established|mission|vision|values|culture/i.test(
        lower
      )
    ) {
      const trimmed = sentence.trim();
      if (!parts.includes(trimmed) && trimmed.length < 200) {
        parts.push(trimmed);
        if (parts.join(" ").length > maxLength * 0.6) break;
      }
    }
  }

  // Priority 2: Key responsibilities and daily tasks
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (
      /responsibilit|duties|will|will be|primary|main|develop|design|manage|create|implement|handle|ensure/i.test(
        lower
      ) &&
      !/company|organization|founded|established|mission|vision|values|culture|opportunity to|join us/i.test(
        lower
      )
    ) {
      const trimmed = sentence.trim();
      if (!parts.includes(trimmed) && trimmed.length < 200) {
        parts.push(trimmed);
        if (parts.join(" ").length > maxLength * 0.9) break;
      }
    }
  }

  // Priority 3: Work arrangement and essential details (if space allows)
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!parts.includes(trimmed) && trimmed.length < 150) {
      const lower = trimmed.toLowerCase();
      // Only add if it contains useful info and isn't marketing fluff
      if (
        (/\d+\s*(year|years|month|months)/i.test(trimmed) ||
          /remote|hybrid|onsite|salary|compensation|benefits/i.test(lower)) &&
        !/company|organization|founded|established|mission|vision|values|culture|opportunity to|join us|we are|we offer/i.test(
          lower
        )
      ) {
        const currentLength = parts.join(" ").length;
        if (currentLength + trimmed.length + 1 <= maxLength) {
          parts.push(trimmed);
        } else {
          break;
        }
      }
    }
  }

  let summary = parts.join(" ");
  // Cut at word boundary if needed, don't cut words
  if (summary.length > maxLength) {
    const lastSpace = summary.lastIndexOf(" ", maxLength);
    summary =
      lastSpace > 0
        ? summary.substring(0, lastSpace)
        : summary.substring(0, maxLength);
  }

  // Fallback: get first few requirement-focused sentences
  if (!summary || summary.length < 50) {
    const fallback = sentences
      .filter(
        (s) =>
          /required|must|qualification|experience|years|degree|skill/i.test(
            s.toLowerCase()
          ) && s.length < 200
      )
      .slice(0, 5) // Get more sentences for expanded summary
      .join(" ");

    if (fallback.length > maxLength) {
      const lastSpace = fallback.lastIndexOf(" ", maxLength);
      return lastSpace > 0
        ? fallback.substring(0, lastSpace)
        : fallback.substring(0, maxLength);
    }

    if (fallback) return fallback;

    // Final fallback
    const finalFallback = sentences.slice(0, 5).join(" ");
    if (finalFallback.length > maxLength) {
      const lastSpace = finalFallback.lastIndexOf(" ", maxLength);
      return lastSpace > 0
        ? finalFallback.substring(0, lastSpace)
        : finalFallback.substring(0, maxLength);
    }
    return finalFallback;
  }

  return summary;
}

/**
 * Format lists in text so items appear on separate lines
 * Detects various list patterns and formats them properly
 */
function formatLists(text: string): string {
  // Ensure text starting with bullet points starts on a new line
  text = text.replace(/^([•\-*]\s+)/m, "\n$1");

  // Format numbered lists (1. item, 2. item, etc.) - ensure each is on a new line
  text = text.replace(/(\d+\.\s+[^\d\n]+?)(?=\s+\d+\.|\s*$)/g, (match) => {
    return "\n" + match.trim();
  });

  // Format bullet lists (- item, • item, * item) - ensure each is on a new line
  // Also ensure they start on a new line if they appear after text
  text = text.replace(/([^\n])([-•*]\s+)/g, "$1\n$2");
  text = text.replace(/([-•*]\s+[^\n-•*]+?)(?=\s+[-•*]|\s*$)/g, (match) => {
    return "\n" + match.trim();
  });

  // Format lists separated by semicolons (item1; item2; item3)
  // Only if there are 2+ semicolons (3+ items)
  text = text.replace(
    /([^;]+);\s*([^;]+);\s*([^;]+(?:;\s*[^;]+)*)/g,
    (match) => {
      const items = match
        .split(/\s*;\s*/)
        .filter((item) => item.trim().length > 0);
      if (items.length >= 3) {
        return items.map((item) => "• " + item.trim()).join("\n");
      }
      return match;
    }
  );

  // Format comma-separated lists that are likely meant to be lists
  // Pattern: "item1, item2, item3" (3+ items, short items)
  text = text.replace(
    /([^,]+,\s+[^,]+,\s+[^,]+(?:,\s+[^,]+){1,})/g,
    (match) => {
      const items = match
        .split(/\s*,\s*(?=\w)/)
        .filter((item) => item.trim().length > 0);
      // Only format if it looks like a list (3+ items, each item is reasonably short)
      if (
        items.length >= 3 &&
        items.every((item) => {
          const trimmed = item.trim();
          // Remove "and" or "or" from last item for length check
          const cleaned = trimmed.replace(/^(and|or)\s+/i, "").trim();
          return cleaned.length < 60 && !cleaned.includes(".");
        })
      ) {
        // Check if last item has "and" or "or"
        const lastItem = items[items.length - 1];
        const hasConjunction = /^(and|or)\s+/i.test(lastItem);

        if (hasConjunction) {
          // Format with conjunction on last item
          const formatted = items.map((item, index) => {
            const trimmed = item.trim();
            if (index === items.length - 1) {
              return "• " + trimmed;
            }
            return "• " + trimmed;
          });
          return formatted.join("\n");
        } else {
          return items.map((item) => "• " + item.trim()).join("\n");
        }
      }
      return match;
    }
  );

  // Ensure bullet points at the start of paragraphs are on new lines
  // Pattern: text ending with period/question/exclamation followed by bullet
  text = text.replace(/([.!?])\s*([•\-*]\s+)/g, "$1\n\n$2");

  // Ensure bullet points after colons are on new lines
  text = text.replace(/(:)\s*([•\-*]\s+)/g, "$1\n$2");

  // Clean up: remove leading newline from start of text, clean up multiple newlines
  text = text.replace(/^\n+/, "");
  text = text.replace(/\n{3,}/g, "\n\n");

  return text;
}

/**
 * Format summary text into paragraphs for better readability
 * Groups related sentences into well-separated paragraphs
 */
function formatIntoParagraphs(text: string): string {
  // First, format any lists in the text
  text = formatLists(text);

  // If text already has paragraph breaks, preserve and clean them
  if (text.includes("\n\n") || text.includes("\n")) {
    // Split by double newlines first (paragraphs), then handle single newlines within
    const paragraphs = text.split(/\n\n+/);
    return paragraphs
      .map((p) => {
        const trimmed = p.trim();
        // If paragraph starts with bullet, ensure it's on its own line
        if (/^[•\-*]\s/.test(trimmed)) {
          return "\n" + trimmed;
        }
        return trimmed;
      })
      .filter((p) => p.length > 0)
      .join("\n\n");
  }

  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  if (sentences.length <= 2) {
    return sentences.join(" ");
  }

  // Group sentences into paragraphs
  // Aim for 3-4 paragraphs with 2-5 sentences each for expanded summaries
  const paragraphs: string[] = [];
  const targetParagraphCount = Math.min(
    4,
    Math.max(3, Math.ceil(sentences.length / 4))
  );
  const sentencesPerParagraph = Math.ceil(
    sentences.length / targetParagraphCount
  );
  let currentParagraph: string[] = [];

  for (let i = 0; i < sentences.length; i++) {
    currentParagraph.push(sentences[i].trim());

    // Create a paragraph when we have enough sentences or reach a natural break
    const shouldBreak =
      currentParagraph.length >= sentencesPerParagraph ||
      (i < sentences.length - 1 &&
        (sentences[i].toLowerCase().includes("required") ||
          sentences[i].toLowerCase().includes("qualifications") ||
          sentences[i].toLowerCase().includes("responsibilities") ||
          sentences[i].toLowerCase().includes("duties") ||
          sentences[i].toLowerCase().includes("expect") ||
          sentences[i].toLowerCase().includes("candidate")));

    if (shouldBreak && currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join(" "));
      currentParagraph = [];
    }
  }

  // Add remaining sentences as last paragraph
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(" "));
  }

  // Ensure we have at least 3 paragraphs for better readability
  if (paragraphs.length === 1 && sentences.length > 5) {
    const thirdPoint = Math.floor(sentences.length / 3);
    const twoThirdPoint = Math.floor((sentences.length * 2) / 3);
    paragraphs[0] = sentences.slice(0, thirdPoint).join(" ");
    paragraphs.push(sentences.slice(thirdPoint, twoThirdPoint).join(" "));
    paragraphs.push(sentences.slice(twoThirdPoint).join(" "));
  } else if (paragraphs.length === 2 && sentences.length > 6) {
    const midPoint = Math.floor(sentences.length / 2);
    paragraphs[0] = sentences.slice(0, Math.floor(midPoint / 2)).join(" ");
    paragraphs[1] = sentences
      .slice(Math.floor(midPoint / 2), midPoint)
      .join(" ");
    paragraphs.push(sentences.slice(midPoint).join(" "));
  }

  // Join with double newlines for clear paragraph separation
  return paragraphs.join("\n\n");
}
