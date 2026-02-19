import type { EducationPayload, WorkExperiencePayload } from "@/api/profile/types";

type UnknownRecord = Record<string, unknown>;

export interface ParsedResumeData {
  aboutMe?: string;
  educations: EducationPayload[];
  workExperiences: WorkExperiencePayload[];
  skills: string[];
}

const RAPID_API_KEY = import.meta.env.VITE_RESUME_PARSER_RAPIDAPI_KEY as
  | string
  | undefined;
const RAPID_API_HOST =
  (import.meta.env.VITE_RESUME_PARSER_RAPIDAPI_HOST as string | undefined) ||
  "resume-parsing-api2.p.rapidapi.com";
const RAPID_API_URL =
  (import.meta.env.VITE_RESUME_PARSER_RAPIDAPI_URL as string | undefined) ||
  `https://${RAPID_API_HOST}/processDocument`;

function normalizeSkillName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = normalizeSkillName(value);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
  }
  return output;
}

function toObject(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" ? (value as UnknownRecord) : null;
}

function readNestedArray(obj: UnknownRecord, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = obj[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function readNestedString(obj: UnknownRecord, keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function parseDate(input: string | undefined, isEndDate = false): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw || /present|current|now/i.test(raw)) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}$/.test(raw)) {
    if (!isEndDate) return `${raw}-01`;
    const [yearRaw, monthRaw] = raw.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const lastDay = new Date(year, month, 0).getDate();
    return `${raw}-${String(lastDay).padStart(2, "0")}`;
  }
  if (/^\d{4}$/.test(raw)) return isEndDate ? `${raw}-12-31` : `${raw}-01-01`;

  const parsed = new Date(`1 ${raw}`);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = parsed.getMonth() + 1;
  if (!isEndDate) return `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    const output: string[] = [];
    for (const item of value) {
      if (typeof item === "string") {
        output.push(item);
        continue;
      }
      const itemObj = toObject(item);
      if (!itemObj) continue;
      const candidate =
        (itemObj.name as string) ||
        (itemObj.skill as string) ||
        (itemObj.title as string) ||
        (itemObj.value as string);
      if (typeof candidate === "string") output.push(candidate);
    }
    return output;
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,;|]/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeWorkExperiences(root: UnknownRecord): WorkExperiencePayload[] {
  const rows = readNestedArray(root, [
    "work_experience",
    "workExperience",
    "experience",
    "experiences",
    "employment_history",
  ]);

  const output: WorkExperiencePayload[] = [];
  for (const row of rows) {
    const obj = toObject(row);
    if (!obj) continue;

    const job_title = readNestedString(obj, ["job_title", "title", "position", "role"]);
    const company = readNestedString(obj, ["company", "company_name", "employer"]);
    const startRaw = readNestedString(obj, ["start_date", "startDate", "from", "date_from"]);
    const endRaw = readNestedString(obj, ["end_date", "endDate", "to", "date_to"]);
    const startDate = parseDate(startRaw, false);
    const endDate = parseDate(endRaw, true);
    const isCurrent = !endRaw || /present|current|now/i.test(endRaw);

    if (!job_title || !company || !startDate) continue;

    output.push({
      job_title,
      company,
      location: readNestedString(obj, ["location", "city", "country"]) || undefined,
      job_type: readNestedString(obj, ["job_type", "employment_type", "type"]) || undefined,
      start_date: startDate,
      end_date: isCurrent ? undefined : (endDate ?? undefined),
      is_current: isCurrent,
    });
  }

  return output;
}

function normalizeEducations(root: UnknownRecord): EducationPayload[] {
  const rows = readNestedArray(root, [
    "education",
    "educations",
    "academic_background",
    "academic",
  ]);

  const output: EducationPayload[] = [];
  for (const row of rows) {
    const obj = toObject(row);
    if (!obj) continue;

    const school_name = readNestedString(obj, [
      "school_name",
      "school",
      "institute",
      "institution",
      "university",
      "college",
    ]);
    const startRaw = readNestedString(obj, ["start_date", "startDate", "from", "date_from"]);
    const endRaw = readNestedString(obj, ["end_date", "endDate", "to", "date_to"]);
    const startDate = parseDate(startRaw, false);
    const endDate = parseDate(endRaw, true);
    const isCurrent = !endRaw || /present|current|now/i.test(endRaw);

    if (!school_name || !startDate) continue;

    output.push({
      school_name,
      major: readNestedString(obj, ["major", "field_of_study", "title"]) || undefined,
      degree_type: readNestedString(obj, ["degree_type", "degree", "qualification"]) || undefined,
      start_date: startDate,
      end_date: isCurrent ? undefined : (endDate ?? undefined),
      is_current: isCurrent,
    });
  }

  return output;
}

function normalizeParsedResume(raw: UnknownRecord): ParsedResumeData {
  const root =
    toObject(raw.data) ||
    toObject(raw.result) ||
    toObject(raw.response) ||
    toObject(raw.parsed_data) ||
    raw;

  const aboutMe =
    readNestedString(root, ["summary", "professional_summary", "profile_summary", "objective", "about_me"]) ||
    readNestedString(raw, ["summary", "professional_summary", "profile_summary", "objective", "about_me"]);

  const skills = dedupeStrings([
    ...toStringList(root.skills),
    ...toStringList(root.technical_skills),
    ...toStringList(root.soft_skills),
    ...toStringList(raw.skills),
  ]);

  return {
    aboutMe: aboutMe || undefined,
    educations: normalizeEducations(root),
    workExperiences: normalizeWorkExperiences(root),
    skills,
  };
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read CV file."));
    reader.readAsDataURL(file);
  });
}

function buildExtractionDetails() {
  return {
    name: "Resume - Extraction",
    language: "English",
    fields: [
      {
        key: "personal_info",
        description: "personal information of the person",
        type: "object",
        properties: [
          { key: "name", description: "name of the person", example: "Alex Smith", type: "string" },
          { key: "email", description: "email of the person", example: "alex.smith@gmail.com", type: "string" },
          { key: "phone", description: "phone of the person", example: "0712 123 123", type: "string" },
          { key: "address", description: "address of the person", example: "Bucharest, Romania", type: "string" },
        ],
      },
      {
        key: "work_experience",
        description: "work experience of the person",
        type: "array",
        items: {
          type: "object",
          properties: [
            { key: "title", description: "title of the job", example: "Software Engineer", type: "string" },
            { key: "start_date", description: "start date of the job", example: "2022", type: "string" },
            { key: "end_date", description: "end date of the job", example: "2023", type: "string" },
            { key: "company", description: "company of the job", example: "Fastapp Development", type: "string" },
            { key: "location", description: "location of the job", example: "Bucharest, Romania", type: "string" },
            { key: "description", description: "description of the job", example: "Designing and implementing server-side logic.", type: "string" },
          ],
        },
      },
      {
        key: "education",
        description: "school education of the person",
        type: "array",
        items: {
          type: "object",
          properties: [
            { key: "title", description: "title of the education", example: "Master of Science in Computer Science", type: "string" },
            { key: "start_date", description: "start date of the education", example: "2022", type: "string" },
            { key: "end_date", description: "end date of the education", example: "2023", type: "string" },
            { key: "institute", description: "institute of the education", example: "Bucharest Academy of Economic Studies", type: "string" },
            { key: "location", description: "location of the education", example: "Bucharest, Romania", type: "string" },
            { key: "description", description: "description of the education", example: "Advanced academic degree focusing on computer technology.", type: "string" },
          ],
        },
      },
      {
        key: "languages",
        description: "languages spoken by the person",
        type: "array",
        items: { type: "string", example: "English" },
      },
      {
        key: "skills",
        description: "skills of the person",
        type: "array",
        items: { type: "string", example: "NodeJS" },
      },
      {
        key: "certificates",
        description: "certificates of the person",
        type: "array",
        items: { type: "string", example: "AWS Certified Developer - Associate" },
      },
    ],
  };
}

async function callResumeApi(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UnknownRecord> {
  if (!RAPID_API_KEY) {
    throw new Error("Missing `VITE_RESUME_PARSER_RAPIDAPI_KEY` in environment.");
  }

  onProgress?.(5);
  const fileDataUrl = await fileToDataUrl(file);
  onProgress?.(15);
  const body = {
    extractionDetails: buildExtractionDetails(),
    file: fileDataUrl,
  };

  const payload = JSON.stringify(body);

  const raw = await new Promise<UnknownRecord>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      const ratio = event.loaded / event.total;
      const scaled = 15 + ratio * 70;
      onProgress?.(Math.max(15, Math.min(85, Math.round(scaled))));
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) return;

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(
          new Error(
            `Resume parser failed (${xhr.status}): ${xhr.responseText || "unknown error"}`,
          ),
        );
        return;
      }

      try {
        onProgress?.(95);
        resolve(JSON.parse(xhr.responseText) as UnknownRecord);
      } catch {
        reject(new Error("Resume parser returned invalid JSON."));
      }
    };

    xhr.onerror = () => reject(new Error("Resume parser request failed."));
    xhr.ontimeout = () => reject(new Error("Resume parser request timed out."));

    xhr.open("POST", RAPID_API_URL);
    xhr.setRequestHeader("x-rapidapi-key", RAPID_API_KEY);
    xhr.setRequestHeader("x-rapidapi-host", RAPID_API_HOST);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(payload);
  });

  return raw;
}

export async function parseResumePdf(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ParsedResumeData> {
  const raw = await callResumeApi(file, onProgress);
  return normalizeParsedResume(raw);
}
