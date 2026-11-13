import { employerBffFetch } from "@/api/employer/employerBffClient";
import {
  assertEmployerJobsProxyConfigured,
  getJobApplicationsApiBaseUrl,
} from "@/api/employer/employerJobsApiBase";
import type {
  StartInterviewParams,
  StartInterviewResponse,
  SubmitInterviewResponse,
} from "@/api/interview/types";
import { isOnboardingRoleId } from "@/onboarding/onboardingAnswers";

export type InterviewApiError = Error & {
  status?: number;
};

function interviewUrl(path: string): string {
  const base = getJobApplicationsApiBaseUrl().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return new URL(p, `${base}/`).toString();
}

function formatInterviewErrorDetail(data: Record<string, unknown>): string {
  const d = data.detail ?? data.error;
  if (typeof d === "string" && d.trim()) return d.trim();
  if (Array.isArray(d)) {
    return d.map((x) => String(x)).filter(Boolean).join(" ");
  }
  if (typeof data.message === "string" && data.message.trim()) {
    return data.message.trim();
  }
  return "";
}

function interviewStartBody(
  params: StartInterviewParams | string,
):
  | { role: string; mode?: "text" }
  | { job_id: number; mode?: "text" }
  | { job_position: string; mode?: "text" } {
  if (typeof params === "string") {
    const trimmed = params.trim();
    if (!trimmed) {
      throw new Error("გთხოვთ, მიუთითოთ სამუშაო პოზიცია.");
    }
    return isOnboardingRoleId(trimmed)
      ? { role: trimmed }
      : { job_position: trimmed };
  }

  if ("role" in params) {
    const role = params.role.trim();
    if (!role) {
      throw new Error("გთხოვთ, მიუთითოთ სამუშაო პოზიცია.");
    }
    return withInterviewMode({ role }, params.mode);
  }

  if ("job_id" in params) {
    if (!Number.isFinite(params.job_id)) {
      throw new Error("არასწორი სამუშაოს იდენტიფიკატორი.");
    }
    return withInterviewMode({ job_id: params.job_id }, params.mode);
  }

  const position = params.job_position.trim();
  if (!position) {
    throw new Error("გთხოვთ, მიუთითოთ სამუშაო პოზიცია.");
  }
  return withInterviewMode({ job_position: position }, params.mode);
}

function withInterviewMode<T extends Record<string, unknown>>(
  body: T,
  mode: "spoken" | "text" | undefined,
): T | (T & { mode: "text" }) {
  if (mode === "text") return { ...body, mode: "text" };
  return body;
}

async function parseJsonBody(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return { detail: text };
  }
}

function throwInterviewError(
  res: Response,
  data: Record<string, unknown>,
): never {
  const detail = formatInterviewErrorDetail(data);
  const fallback =
    res.status === 401
      ? "ავტორიზაცია ვერ მოხერხდა. გთხოვთ, ხელახლა შეხვიდეთ სისტემაში."
      : res.status === 403
        ? "წვდომა აკრძალულია."
        : res.status === 404
          ? "კითხვა ვერ მოიძებნა ან თქვენს ანგარიშს არ ეკუთვნის."
            : res.status === 400
            ? "ეს როლი ინტერვიუსთვის მომზადებული არ არის."
            : res.status === 500
              ? "სერვერის შეცდომა ანალიზისას. სცადეთ ხელახლა ან შეამოწმეთ ჩანაწერი (მინ. 3 წამი)."
              : res.status === 502
                ? "AI ანალიზი ვერ დასრულდა. სცადეთ ხელახლა რამდენიმე წუთში."
                : `მოთხოვნა ვერ შესრულდა (${res.status})`;

  const err = new Error(detail || fallback) as InterviewApiError;
  err.status = res.status;
  throw err;
}

/** POST /api/v1/interview/start/ — BFF injects user_id server-side. */
export async function startInterview(
  params: StartInterviewParams | string,
): Promise<StartInterviewResponse> {
  assertEmployerJobsProxyConfigured("POST");

  const body = interviewStartBody(params);

  const res = await employerBffFetch(interviewUrl("/api/v1/interview/start/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await parseJsonBody(res);
  if (!res.ok) throwInterviewError(res, data);

  return data as unknown as StartInterviewResponse;
}

/** POST /api/v1/interview/submit-audio/{questionId}/ — multipart audio_file. */
export async function submitInterviewAudio(
  questionId: string,
  audioBlob: Blob,
): Promise<SubmitInterviewResponse> {
  assertEmployerJobsProxyConfigured("POST");

  const id = encodeURIComponent(String(questionId).trim());
  if (!id) {
    throw new Error("კითხვის იდენტიფიკატორი არ არის.");
  }

  const maxBytes = 25 * 1024 * 1024;
  if (audioBlob.size > maxBytes) {
    throw new Error("ჩანაწერი 25 MB-ზე მეტია. გთხოვთ, შეამციროთ ხანგრძლივობა.");
  }

  const formData = new FormData();
  const ext = audioBlob.type.includes("webm")
    ? "webm"
    : audioBlob.type.includes("ogg")
      ? "ogg"
      : audioBlob.type.includes("mp4")
        ? "m4a"
        : "webm";
  formData.append("audio_file", audioBlob, `interview-recording.${ext}`);

  const res = await employerBffFetch(
    interviewUrl(`/api/v1/interview/submit-audio/${id}/`),
    {
      method: "POST",
      body: formData,
    },
  );

  const data = await parseJsonBody(res);
  if (!res.ok) throwInterviewError(res, data);

  return data as unknown as SubmitInterviewResponse;
}

/** POST /api/v1/interview/submit-text/{questionId}/ — typed answer, no audio. */
export async function submitInterviewText(
  questionId: string,
  answer: string,
): Promise<SubmitInterviewResponse> {
  assertEmployerJobsProxyConfigured("POST");

  const id = encodeURIComponent(String(questionId).trim());
  const text = answer.trim();
  if (!id) {
    throw new Error("კითხვის იდენტიფიკატორი არ არის.");
  }
  if (!text) {
    throw new Error("პასუხი ცარიელია.");
  }

  const res = await employerBffFetch(
    interviewUrl(`/api/v1/interview/submit-text/${id}/`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: text }),
    },
  );

  const data = await parseJsonBody(res);
  if (!res.ok) throwInterviewError(res, data);

  return data as unknown as SubmitInterviewResponse;
}

/** POST /api/v1/interview/transcribe/ — speech to text, no scoring. */
export async function transcribeInterviewAudio(
  audioBlob: Blob,
  language: "ka" | "en",
): Promise<string> {
  assertEmployerJobsProxyConfigured("POST");

  const maxBytes = 25 * 1024 * 1024;
  if (audioBlob.size > maxBytes) {
    throw new Error("ჩანაწერი 25 MB-ზე მეტია. გთხოვთ, შეამციროთ ხანგრძლივობა.");
  }

  const formData = new FormData();
  const ext = audioBlob.type.includes("webm")
    ? "webm"
    : audioBlob.type.includes("ogg")
      ? "ogg"
      : audioBlob.type.includes("mp4")
        ? "m4a"
        : "webm";
  formData.append("audio_file", audioBlob, `interview-recording.${ext}`);
  formData.append("language", language);

  const res = await employerBffFetch(interviewUrl("/api/v1/interview/transcribe/"), {
    method: "POST",
    body: formData,
  });

  const data = await parseJsonBody(res);
  if (!res.ok) throwInterviewError(res, data);

  const transcript =
    data && typeof data === "object" && "transcript" in data
      ? String((data as { transcript?: unknown }).transcript ?? "").trim()
      : "";
  if (!transcript) {
    throw new Error("ხმა ვერ გაიშიფრა. სცადე თავიდან.");
  }
  return transcript;
}

export const interviewApi = {
  startInterview,
  submitInterviewAudio,
  submitInterviewText,
  transcribeInterviewAudio,
};
