import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, EyeOff, ImageIcon } from "lucide-react";
import { CountrySelector } from "@/components/ui/CountrySelector";
import { Country, countries } from "@/data/countries";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BreneoLogo } from "@/components/common/BreneoLogo";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { isCompanyWorkEmail } from "@/utils/companyEmail";
import { TokenManager } from "@/api/auth/tokenManager";
import { getLocalizedPath } from "@/utils/localeUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { IndustryMultiSelect } from "@/components/employer/IndustryMultiSelect";
import { EmployerCompanySearchField } from "@/components/employer/EmployerCompanySearchField";
import {
  buildAggregatorCompanyCreatePayload,
  createEmployerDirectoryCompanyQuick,
  joinOrCreateEmployerAggregatorCompany,
  fetchAggregatorIndustries,
  type AggregatorCompany,
  type AggregatorIndustry,
} from "@/api/employer/aggregatorBffApi";
import {
  extractBreneoUserIdFromEmployerProfileRaw,
  extractBreneoUserIdFromJwt,
} from "@/api/employer/profile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PLACEHOLDER_COMPANY_NAME = "Pending company setup";

const EMPLOYEE_COUNT_OPTIONS = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
] as const;

/** Register / resend can block on email delivery; default axios 10s is often too short. */
const EMPLOYER_REGISTER_TIMEOUT_MS = 45_000;

const SESSION_EMPLOYER_FIRST = "tempEmployerFirstName";
const SESSION_EMPLOYER_LAST = "tempEmployerLastName";

function buildEmployerRegisterBody(
  first: string,
  last: string,
  emailRaw: string,
  password: string,
) {
  const firstT = first.trim();
  const lastT = last.trim();
  const fullPersonName = `${firstT} ${lastT}`.trim();
  return {
    company_name: PLACEHOLDER_COMPANY_NAME,
    email: emailRaw.trim().toLowerCase(),
    password,
    first_name: firstT,
    last_name: lastT,
    name: fullPersonName,
    phone_number: "",
    description: "",
    website: "",
    locations: [] as string[],
    number_of_employees: EMPLOYEE_COUNT_OPTIONS[0],
    industry_names: [] as string[],
  };
}

function workEmailDomain(email: string): string {
  const at = email.indexOf("@");
  if (at === -1) return "";
  return email.slice(at + 1).trim().toLowerCase();
}

function formatApiErrors(
  data: unknown,
  opts?: { status?: number },
): string {
  if (data == null || typeof data === "string") {
    if (typeof data === "string" && data.trim()) return data.trim();
    return opts?.status
      ? `Request failed (${opts.status}).`
      : "Something went wrong.";
  }
  if (typeof data !== "object") return "Something went wrong.";
  const d = data as Record<string, unknown>;

  const detail = d.detail;
  if (typeof detail === "string" && detail.trim()) return detail.trim();
  if (Array.isArray(detail)) {
    const s = detail
      .map((item) =>
        typeof item === "string"
          ? item
          : item && typeof item === "object"
            ? JSON.stringify(item)
            : String(item),
      )
      .join(" ");
    if (s.trim()) return s.trim();
  }
  if (detail && typeof detail === "object") {
    const nested = formatApiErrors(detail, opts);
    if (nested !== "Something went wrong.") return nested;
    try {
      return JSON.stringify(detail);
    } catch {
      return "Something went wrong.";
    }
  }

  const nfe = d.non_field_errors;
  if (Array.isArray(nfe) && nfe.length) {
    return nfe.map((x) => String(x)).join(" ");
  }

  if (typeof d.message === "string" && d.message.trim()) return d.message;
  if (typeof d.error === "string" && d.error.trim()) return d.error;

  const parts: string[] = [];
  for (const [key, v] of Object.entries(d)) {
    if (key === "detail" || key === "non_field_errors") continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === "string") parts.push(`${key}: ${item}`);
        else if (item && typeof item === "object")
          parts.push(`${key}: ${JSON.stringify(item)}`);
        else parts.push(`${key}: ${String(item)}`);
      }
    } else if (typeof v === "string") parts.push(`${key}: ${v}`);
    else if (v && typeof v === "object") parts.push(`${key}: ${JSON.stringify(v)}`);
  }
  if (parts.length) return parts.join(" ");

  return opts?.status
    ? `Request failed (${opts.status}).`
    : "Something went wrong.";
}

function parseLocations(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const EmployerRegistrationPage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [website, setWebsite] = useState("");
  const [locationsRaw, setLocationsRaw] = useState("");
  const [numberOfEmployees, setNumberOfEmployees] = useState<string>(
    EMPLOYEE_COUNT_OPTIONS[2],
  );
  const [selectedIndustryIds, setSelectedIndustryIds] = useState<number[]>([]);
  const [selectedDirectoryCompany, setSelectedDirectoryCompany] =
    useState<AggregatorCompany | null>(null);
  const [showNewCompanyDetails, setShowNewCompanyDetails] = useState(false);
  const [companyDomain, setCompanyDomain] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");

  const [industries, setIndustries] = useState<AggregatorIndustry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const [logoLoaded, setLogoLoaded] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(
    countries.find((c) => c.code === "GE"),
  );

  const preloadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const loadIndustries = async () => {
      try {
        const list = await fetchAggregatorIndustries();
        setIndustries(list);
      } catch {
        toast.error(
          "Could not load industries. Check your connection or try again in a moment.",
        );
      }
    };
    loadIndustries();
  }, []);

  useEffect(() => {
    const preloadImages = async () => {
      try {
        await Promise.all([
          preloadImage("/lovable-uploads/Breneo-logo.png"),
          preloadImage("/lovable-uploads/Breneo-logo-dark.png"),
          preloadImage("/lovable-uploads/future.png"),
        ]);
      } catch {
        setImageError(true);
      }
    };
    preloadImages();
  }, [preloadImage]);

  useEffect(() => {
    document.title = "Employer registration | Breneo";
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [resendCooldown]);

  /** Step 3 company search needs a JWT; restore session after refresh or if post-verify login failed. */
  useEffect(() => {
    if (step !== 3) return;
    if (TokenManager.getAccessToken()) return;
    const emailStored = sessionStorage.getItem("tempEmployerEmail");
    const passwordStored = sessionStorage.getItem("tempEmployerPassword");
    if (!emailStored || !passwordStored) return;
    let cancelled = false;
    void (async () => {
      try {
        const loginRes = await apiClient.post(
          API_ENDPOINTS.EMPLOYER.LOGIN,
          {
            email: emailStored.trim().toLowerCase(),
            password: passwordStored,
          },
          { timeout: EMPLOYER_REGISTER_TIMEOUT_MS },
        );
        const access =
          loginRes.data?.access || loginRes.data?.token;
        const refreshTok =
          loginRes.data?.refresh || loginRes.data?.refresh_token;
        if (!cancelled && access) {
          TokenManager.setTokens(access, refreshTok || "");
          localStorage.setItem("userRole", "employer");
        }
      } catch {
        /* Submit step 3 still performs login */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step]);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) {
      toast.error("First name and last name are required.");
      return;
    }
    if (!email.trim() || !password) {
      toast.error("Enter your work email and password.");
      return;
    }
    if (!isCompanyWorkEmail(email)) {
      toast.error(
        "Use your company email address (personal addresses like Gmail or Yahoo are not accepted).",
      );
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = buildEmployerRegisterBody(first, last, email, password);
      const res = await apiClient.post(
        API_ENDPOINTS.EMPLOYER.REGISTER,
        payload,
        { timeout: EMPLOYER_REGISTER_TIMEOUT_MS },
      );

      const msg =
        (res.data &&
          typeof res.data === "object" &&
          "message" in res.data &&
          typeof (res.data as { message?: string }).message === "string" &&
          (res.data as { message: string }).message) ||
        "Verification code sent to your email.";

      if (res.status === 202) {
        toast.warning(msg);
      } else {
        toast.success(msg);
      }

      const emailNorm = email.trim().toLowerCase();
      sessionStorage.setItem("tempEmployerEmail", emailNorm);
      sessionStorage.setItem("tempEmployerPassword", password);
      sessionStorage.setItem(SESSION_EMPLOYER_FIRST, first);
      sessionStorage.setItem(SESSION_EMPLOYER_LAST, last);
      setResendCooldown(60);
      setStep(2);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: unknown; status?: number } };
      toast.error(
        formatApiErrors(ax.response?.data, { status: ax.response?.status }),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").trim();
    if (/^\d{6}$/.test(pastedData)) {
      setCode(pastedData.split(""));
      inputRefs.current[5]?.focus();
      toast.success("Code pasted");
    } else {
      toast.error("Paste a valid 6-digit code");
    }
  };

  const handleResendVerification = async () => {
    const emailStored = sessionStorage.getItem("tempEmployerEmail");
    const passwordStored = sessionStorage.getItem("tempEmployerPassword");
    const fn = sessionStorage.getItem(SESSION_EMPLOYER_FIRST);
    const ln = sessionStorage.getItem(SESSION_EMPLOYER_LAST);
    if (!emailStored || !passwordStored || !fn || !ln) {
      toast.error(
        "Session expired. Go back to step 1 and submit the form again to receive a code.",
      );
      return;
    }
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    try {
      const payload = buildEmployerRegisterBody(fn, ln, emailStored, passwordStored);
      const res = await apiClient.post(
        API_ENDPOINTS.EMPLOYER.REGISTER,
        payload,
        { timeout: EMPLOYER_REGISTER_TIMEOUT_MS },
      );
      const msg =
        (res.data &&
          typeof res.data === "object" &&
          "message" in res.data &&
          typeof (res.data as { message?: string }).message === "string" &&
          (res.data as { message: string }).message) ||
        "Verification code sent. Check your inbox and spam folder.";
      if (res.status === 202) {
        toast.warning(msg);
      } else {
        toast.success(msg);
      }
      setResendCooldown(60);
      setCode(["", "", "", "", "", ""]);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: unknown; status?: number } };
      toast.error(
        formatApiErrors(ax.response?.data, { status: ax.response?.status }),
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailStored = (
      sessionStorage.getItem("tempEmployerEmail") || email.trim()
    ).trim().toLowerCase();
    const codeString = code.join("").replace(/\D/g, "");
    if (codeString.length !== 6) {
      toast.error("Enter the 6-digit code.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.post(
        API_ENDPOINTS.EMPLOYER.VERIFY_EMAIL,
        {
          email: emailStored,
          code: codeString,
        },
        { timeout: EMPLOYER_REGISTER_TIMEOUT_MS },
      );
      const msg =
        (res.data &&
          typeof res.data === "object" &&
          "message" in res.data &&
          typeof (res.data as { message?: string }).message === "string" &&
          (res.data as { message: string }).message) ||
        "Email verified.";
      toast.success(msg);

      const passwordStored = sessionStorage.getItem("tempEmployerPassword");
      if (passwordStored) {
        try {
          const loginRes = await apiClient.post(
            API_ENDPOINTS.EMPLOYER.LOGIN,
            {
              email: emailStored,
              password: passwordStored,
            },
            { timeout: EMPLOYER_REGISTER_TIMEOUT_MS },
          );
          const access =
            loginRes.data?.access || loginRes.data?.token;
          const refreshTok =
            loginRes.data?.refresh || loginRes.data?.refresh_token;
          if (access) {
            TokenManager.setTokens(access, refreshTok || "");
            localStorage.setItem("userRole", "employer");
          }
        } catch {
          toast.warning(
            "Session for company search could not start. Submit this step to sign in, or refresh and verify again.",
          );
        }
      }

      setStep(3);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: unknown; status?: number } };
      toast.error(
        formatApiErrors(ax.response?.data, { status: ax.response?.status }),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickCreateFromSearch = useCallback(
    async (name: string): Promise<AggregatorCompany> => {
      const trim = name.trim();
      if (!trim) {
        throw new Error("Company name is required.");
      }
      const emailStored = sessionStorage.getItem("tempEmployerEmail");
      const passwordStored = sessionStorage.getItem("tempEmployerPassword");
      if (!emailStored || !passwordStored) {
        toast.error("Session expired. Start registration again.");
        navigate("/employer/register");
        throw new Error("Session expired");
      }
      if (!industries.length) {
        toast.error("Industries are still loading. Try again in a moment.");
        throw new Error("Industries not loaded");
      }
      let token = TokenManager.getAccessToken();
      if (!token) {
        const loginRes = await apiClient.post(API_ENDPOINTS.EMPLOYER.LOGIN, {
          email: emailStored,
          password: passwordStored,
        });
        token = loginRes.data?.access || loginRes.data?.token;
        const refresh =
          loginRes.data?.refresh || loginRes.data?.refresh_token || "";
        if (!token) {
          toast.error("Could not sign you in. Try the login page.");
          throw new Error("No token");
        }
        TokenManager.setTokens(token, refresh || "");
        localStorage.setItem("userRole", "employer");
      }
      const profileRes = await apiClient.get(API_ENDPOINTS.EMPLOYER.PROFILE);
      const breneoUserId =
        extractBreneoUserIdFromEmployerProfileRaw(profileRes.data) ||
        extractBreneoUserIdFromJwt(token);
      if (!breneoUserId) {
        toast.error("Could not resolve your user id.");
        throw new Error("No user id");
      }
      try {
        const company = await createEmployerDirectoryCompanyQuick({
          name: trim,
          companyEmail: emailStored.trim().toLowerCase(),
          breneoUserId,
          domain:
            companyDomain.trim() || workEmailDomain(emailStored),
          industriesCatalog: industries,
        });
        setShowNewCompanyDetails(true);
        toast.success("Company created on the job directory.");
        return company;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not create company.";
        toast.error(msg);
        throw e;
      }
    },
    [industries, companyDomain, navigate],
  );

  const handleStep3Company = async (e: React.FormEvent) => {
    e.preventDefault();
    const breneoCompanyName = selectedDirectoryCompany
      ? String(selectedDirectoryCompany.name ?? "").trim() || companyName.trim()
      : companyName.trim();
    if (!breneoCompanyName.trim()) {
      toast.error(
        "Company name is required.",
      );
      return;
    }
    if (showNewCompanyDetails && !description.trim()) {
      toast.error("Description is required for a new company.");
      return;
    }
    if (selectedDirectoryCompany) {
      const cid = selectedDirectoryCompany.id;
      if (cid == null || String(cid).trim() === "") {
        toast.error(
          "This company cannot be linked (missing id). Create a new company instead.",
        );
        return;
      }
    }
    const locations = parseLocations(locationsRaw);
    const emailStored = sessionStorage.getItem("tempEmployerEmail");
    const passwordStored = sessionStorage.getItem("tempEmployerPassword");
    if (!emailStored || !passwordStored) {
      toast.error("Session expired. Start registration again.");
      navigate("/employer/register");
      return;
    }

    const phoneNumber = `${selectedCountry?.dial_code ?? ""}${phoneLocal}`.trim();

    setIsLoading(true);
    try {
      let token = TokenManager.getAccessToken();
      let refresh = TokenManager.getRefreshToken() ?? "";
      if (!token) {
        const loginRes = await apiClient.post(API_ENDPOINTS.EMPLOYER.LOGIN, {
          email: emailStored,
          password: passwordStored,
        });
        token =
          loginRes.data?.access || loginRes.data?.token;
        refresh =
          loginRes.data?.refresh || loginRes.data?.refresh_token || "";
        if (!token) {
          toast.error(
            "Could not sign you in. Please try logging in from the login page.",
          );
          return;
        }
        TokenManager.setTokens(token, refresh || "");
        localStorage.setItem("userRole", "employer");
      }

      const industryNamesBySelectionOrder = selectedIndustryIds.map((id) => {
        const row = industries.find((i) => i.id === id);
        return row?.name ?? "";
      });

      const profileRes = await apiClient.get(API_ENDPOINTS.EMPLOYER.PROFILE);
      const breneoUserId =
        extractBreneoUserIdFromEmployerProfileRaw(profileRes.data) ||
        extractBreneoUserIdFromJwt(token);
      if (!breneoUserId) {
        toast.error(
          "Could not resolve your user id for the job directory. Contact support.",
        );
        return;
      }

      const first = firstName.trim();
      const last = lastName.trim();
      const fullPersonName = `${first} ${last}`.trim();

      const baseProfilePatch: Record<string, unknown> = {
        company_name: breneoCompanyName.trim(),
        name: fullPersonName,
        first_name: first,
        last_name: last,
      };
      const profilePatch = showNewCompanyDetails
        ? {
            ...baseProfilePatch,
            description: description.trim(),
            phone_number: phoneNumber,
            website: website.trim(),
            locations,
            number_of_employees: numberOfEmployees,
            industries: selectedIndustryIds,
            industry_names: industryNamesBySelectionOrder,
          }
        : baseProfilePatch;
      const patchRes = await apiClient.patch(
        API_ENDPOINTS.EMPLOYER.PROFILE,
        profilePatch,
      );

      let aggregatorCompanyOk = false;
      try {
        if (selectedDirectoryCompany?.id != null) {
          await joinOrCreateEmployerAggregatorCompany({
            breneoUserId,
            mode: "existing",
            existingCompanyId: String(selectedDirectoryCompany.id),
            existingCompanyName: String(selectedDirectoryCompany.name ?? ""),
          });
        } else {
          const aggregatorPayload = buildAggregatorCompanyCreatePayload({
            name: companyName.trim(),
            companyEmail: emailStored.trim().toLowerCase(),
            domain:
              companyDomain.trim() || workEmailDomain(emailStored),
            description: description.trim(),
            website: website.trim(),
            logoUrl: companyLogoUrl.trim() || undefined,
            employeesCount: numberOfEmployees,
            selectedIndustryIds,
            industriesCatalog: industries,
            industryNamesBySelectionOrder,
          });
          await joinOrCreateEmployerAggregatorCompany({
            breneoUserId,
            mode: "new",
            createPayload: aggregatorPayload,
          });
        }
        aggregatorCompanyOk = true;
      } catch (aggErr: unknown) {
        const msg =
          aggErr instanceof Error ? aggErr.message : "Aggregator error";
        toast.error(
          `Breneo profile saved, but the job directory company was not created: ${msg}. You can retry from your company profile.`,
        );
      }

      sessionStorage.removeItem("tempEmployerEmail");
      sessionStorage.removeItem("tempEmployerPassword");
      sessionStorage.removeItem(SESSION_EMPLOYER_FIRST);
      sessionStorage.removeItem(SESSION_EMPLOYER_LAST);

      if (aggregatorCompanyOk) {
        toast.success("Profile saved. Welcome!");
      }
      window.location.href = getLocalizedPath("/employer/jobs", language);
    } catch (err: unknown) {
      const ax = err as {
        response?: { data?: unknown; status?: number };
        message?: string;
      };
      if (ax.response?.data != null || ax.response?.status != null) {
        toast.error(
          formatApiErrors(ax.response.data, { status: ax.response.status }),
        );
      } else if (err instanceof Error && err.message) {
        toast.error(err.message);
      } else {
        toast.error("Something went wrong.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const progressPct = step === 1 ? "33%" : step === 2 ? "66%" : "100%";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-transparent border-b border-gray-200 dark:border-border">
        <div className="flex items-center">
          {!logoLoaded && !imageError && (
            <div className="h-5 w-16 bg-gray-200 dark:bg-[#242424] animate-pulse rounded flex items-center justify-center">
              <ImageIcon className="h-3 w-3 text-gray-400 dark:text-gray-600" />
            </div>
          )}
          <BreneoLogo
            className={`h-6 lg:h-5 transition-opacity duration-300 ${
              logoLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setLogoLoaded(true)}
            onError={() => {
              setImageError(true);
              setLogoLoaded(true);
            }}
          />
        </div>
        <ThemeToggle />
      </div>

      <div className="flex flex-1">
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
          <div className="w-full max-w-md">
            <div className="mb-4 hidden lg:flex items-center justify-between">
              <BreneoLogo
                className={`h-8 transition-opacity duration-300 ${
                  logoLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setLogoLoaded(true)}
                onError={() => {
                  setImageError(true);
                  setLogoLoaded(true);
                }}
              />
              <ThemeToggle />
            </div>

            <div className="w-full bg-gray-200 dark:bg-secondary rounded-full h-2 mb-8">
              <div
                className="bg-[#00BFFF] h-2 rounded-full transition-all duration-500 ease-in-out"
                style={{ width: progressPct }}
              />
            </div>

            <h1 className="text-2xl font-semibold text-foreground mb-1">
              Employer registration
            </h1>
            <p className="text-muted-foreground mb-6 text-sm">
              Step {step} of 3 —{" "}
              {step === 1
                ? "Your details & sign up"
                : step === 2
                  ? "Verify your email"
                  : "Company details"}
            </p>

            {step === 1 && (
              <form onSubmit={handleStep1} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="emp-first-name">First name</Label>
                    <Input
                      id="emp-first-name"
                      type="text"
                      autoComplete="given-name"
                      className="mt-1 h-[3rem]"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      disabled={isLoading}
                      placeholder="Jane"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emp-last-name">Last name</Label>
                    <Input
                      id="emp-last-name"
                      type="text"
                      autoComplete="family-name"
                      className="mt-1 h-[3rem]"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      disabled={isLoading}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="emp-email">Work email</Label>
                  <Input
                    id="emp-email"
                    type="email"
                    autoComplete="email"
                    className="mt-1 h-[3rem]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    placeholder="you@yourcompany.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use your company domain — personal email providers are not
                    accepted.
                  </p>
                </div>
                <div>
                  <Label htmlFor="emp-password">Password</Label>
                  <div className="relative mt-1">
                    <Input
                      id="emp-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className="h-[3rem] pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-[#00BFFF] text-white hover:bg-[#00BFFF]/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending code…" : "Continue"}
                </Button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleStep2} className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code we sent to{" "}
                  <strong>
                    {sessionStorage.getItem("tempEmployerEmail") || email}
                  </strong>
                  . It may take a minute; check spam or promotions folders.
                </p>
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  {code.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      className="h-12 w-12 text-center text-xl font-semibold"
                      value={digit}
                      onChange={(e) =>
                        handleCodeChange(index, e.target.value)
                      }
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      maxLength={1}
                      disabled={isLoading}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-[#00BFFF] text-white hover:bg-[#00BFFF]/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying…" : "Verify & continue"}
                </Button>
                <button
                  type="button"
                  className="text-sm text-primary hover:underline w-full text-center"
                  onClick={() => setStep(1)}
                >
                  Back
                </button>
                <div className="pt-2 border-t border-border/60 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Didn&apos;t get the code?
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={
                      resendCooldown > 0 || isResending || isLoading
                    }
                    onClick={handleResendVerification}
                  >
                    {isResending
                      ? "Sending…"
                      : resendCooldown > 0
                        ? `Resend code (${resendCooldown}s)`
                        : "Resend verification code"}
                  </Button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleStep3Company} className="space-y-4">
                <EmployerCompanySearchField
                  disabled={isLoading}
                  selected={selectedDirectoryCompany}
                  onSelectExisting={(c) => {
                    setSelectedDirectoryCompany(c);
                    setShowNewCompanyDetails(false);
                    if (c?.name) setCompanyName(String(c.name));
                    else setCompanyName("");
                  }}
                  companyName={companyName}
                  onCompanyNameChange={setCompanyName}
                  onQuickCreateCompany={handleQuickCreateFromSearch}
                />
                {showNewCompanyDetails && !selectedDirectoryCompany ? (
                  <>
                    <div>
                      <Label htmlFor="co-domain">Domain</Label>
                      <Input
                        id="co-domain"
                        className="mt-1 h-[3rem]"
                        value={companyDomain}
                        onChange={(e) => setCompanyDomain(e.target.value)}
                        disabled={isLoading}
                        placeholder="e.g. acme.com"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <Label htmlFor="co-logo">Logo URL (optional)</Label>
                      <Input
                        id="co-logo"
                        type="url"
                        className="mt-1 h-[3rem]"
                        value={companyLogoUrl}
                        onChange={(e) => setCompanyLogoUrl(e.target.value)}
                        disabled={isLoading}
                        placeholder="https://…"
                      />
                    </div>
                  </>
                ) : null}
                {showNewCompanyDetails ? (
                  <>
                    <div>
                      <Label htmlFor="co-desc">Description</Label>
                      <Textarea
                        id="co-desc"
                        className="mt-1 min-h-[100px]"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        disabled={isLoading}
                        placeholder="Short description of your company"
                      />
                    </div>
                    <div>
                      <Label>Phone number</Label>
                      <div className="flex gap-2 mt-1">
                        <CountrySelector
                          value={selectedCountry}
                          onChange={setSelectedCountry}
                        />
                        <Input
                          className="h-[3rem] flex-1"
                          value={phoneLocal}
                          onChange={(e) => setPhoneLocal(e.target.value)}
                          disabled={isLoading}
                          placeholder="Phone"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="co-web">Website</Label>
                      <Input
                        id="co-web"
                        type="url"
                        className="mt-1 h-[3rem]"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        disabled={isLoading}
                        placeholder="https://"
                      />
                    </div>
                    <div>
                      <Label htmlFor="co-loc">Locations</Label>
                      <Textarea
                        id="co-loc"
                        className="mt-1 min-h-[72px]"
                        value={locationsRaw}
                        onChange={(e) => setLocationsRaw(e.target.value)}
                        disabled={isLoading}
                        placeholder="One per line or comma-separated (e.g. Tbilisi, Remote)"
                      />
                    </div>
                    <div>
                      <Label>Number of employees</Label>
                      <Select
                        value={numberOfEmployees}
                        onValueChange={setNumberOfEmployees}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="mt-1 h-[3rem]">
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                          {EMPLOYEE_COUNT_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Industries</Label>
                      {industries.length === 0 ? (
                        <p className="text-sm text-muted-foreground border rounded-md p-3">
                          No industries loaded yet.
                        </p>
                      ) : (
                        <IndustryMultiSelect
                          industries={industries}
                          value={selectedIndustryIds}
                          onChange={setSelectedIndustryIds}
                          disabled={isLoading}
                        />
                      )}
                    </div>
                  </>
                ) : null}
                <Button
                  type="submit"
                  className="w-full h-12 bg-[#00BFFF] text-white hover:bg-[#00BFFF]/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Saving…" : "Finish & go to dashboard"}
                </Button>
                <button
                  type="button"
                  className="text-sm text-primary hover:underline w-full text-center"
                  onClick={() => setStep(2)}
                  disabled={isLoading}
                >
                  Back
                </button>
              </form>
            )}

            <p className="text-center text-muted-foreground mt-8 text-sm">
              Already have an account?{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => navigate("/auth/login")}
              >
                Sign in
              </button>
            </p>
          </div>
        </div>

        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-5">
          <div className="relative w-full h-full rounded-3xl overflow-hidden min-h-[480px]">
            {!backgroundLoaded && !imageError && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#242424] dark:to-[#2a2a2a] animate-pulse flex items-center justify-center">
                <ImageIcon className="h-16 w-16 text-gray-400 dark:text-gray-600" />
              </div>
            )}
            <div
              className={`w-full h-full bg-cover bg-center bg-no-repeat transition-opacity duration-500 ${
                backgroundLoaded ? "opacity-100" : "opacity-0"
              }`}
              style={{
                backgroundImage: backgroundLoaded
                  ? "url('/lovable-uploads/future.png')"
                  : "none",
              }}
            />
            <img
              src="/lovable-uploads/future.png"
              alt=""
              className="hidden"
              onLoad={() => setBackgroundLoaded(true)}
              onError={() => {
                setImageError(true);
                setBackgroundLoaded(true);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployerRegistrationPage;
