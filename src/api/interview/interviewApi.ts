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

export type InterviewApiError = Error & {
  status?: number;
};

function interviewUrl(path: string): string {
  const base = getJobApplicationsApiBaseUrl().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return new URL(p, `${base}/`).toString();
}

function formatInterviewErrorDetail(data: Record<string, unknown>): string {
  const d = data.detail;
  if (typeof d === "string" && d.trim()) return d.trim();
  if (Array.isArray(d)) {
    return d.map((x) => String(x)).filter(Boolean).join(" ");
  }
  if (typeof data.message === "string" && data.message.trim()) {
    return data.message.trim();
  }
  return "";
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
            ? "არასწორი მოთხოვნა. შეამოწმეთ პოზიცია ან ჩანაწერი."
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

  const body =
    typeof params === "string"
      ? { job_position: params.trim() }
      : "job_id" in params && params.job_id != null
        ? { job_id: params.job_id }
        : { job_position: String(params.job_position ?? "").trim() };

  if ("job_id" in body && body.job_id != null) {
    if (!Number.isFinite(body.job_id)) {
      throw new Error("არასწორი სამუშაოს იდენტიფიკატორი.");
    }
  } else if (!body.job_position) {
    throw new Error("გთხოვთ, მიუთითოთ სამუშაო პოზიცია.");
  }

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

export const interviewApi = {
  startInterview,
  submitInterviewAudio,
};
