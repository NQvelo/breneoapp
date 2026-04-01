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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
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

type IndustryOption = { id: number; name: string };

function formatApiErrors(data: unknown): string {
  if (!data || typeof data !== "object") return "Something went wrong.";
  const d = data as Record<string, unknown>;
  if (typeof d.detail === "string") return d.detail;
  if (typeof d.message === "string") return d.message;
  if (typeof d.error === "string") return d.error;
  const parts: string[] = [];
  for (const v of Object.values(d)) {
    if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === "string") parts.push(item);
        else if (item && typeof item === "object" && "string" in (item as object))
          parts.push(String(item));
      }
    } else if (typeof v === "string") parts.push(v);
  }
  return parts.join(" ") || "Something went wrong.";
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

  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [website, setWebsite] = useState("");
  const [locationsRaw, setLocationsRaw] = useState("");
  const [numberOfEmployees, setNumberOfEmployees] = useState<string>(
    EMPLOYEE_COUNT_OPTIONS[2],
  );
  const [selectedIndustryIds, setSelectedIndustryIds] = useState<number[]>([]);

  const [industries, setIndustries] = useState<IndustryOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
        const res = await apiClient.get<IndustryOption[]>(
          API_ENDPOINTS.INDUSTRIES,
        );
        if (Array.isArray(res.data)) setIndustries(res.data);
      } catch {
        toast.error("Could not load industries. You can still continue.");
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

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const res = await apiClient.post(API_ENDPOINTS.EMPLOYER.REGISTER, {
        company_name: PLACEHOLDER_COMPANY_NAME,
        email: email.trim().toLowerCase(),
        password,
        phone_number: "",
        description: "",
        website: "",
        locations: [],
        number_of_employees: EMPLOYEE_COUNT_OPTIONS[0],
        industry_names: [],
      });

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

      sessionStorage.setItem("tempEmployerEmail", email.trim().toLowerCase());
      sessionStorage.setItem("tempEmployerPassword", password);
      setStep(2);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: unknown; status?: number } };
      toast.error(formatApiErrors(ax.response?.data));
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
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pastedData)) {
      setCode(pastedData.split(""));
      inputRefs.current[5]?.focus();
      toast.success("Code pasted");
    } else {
      toast.error("Paste a valid 6-digit code");
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailStored =
      sessionStorage.getItem("tempEmployerEmail") || email.trim().toLowerCase();
    const codeString = code.join("");
    if (codeString.length !== 6) {
      toast.error("Enter the 6-digit code.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.post(API_ENDPOINTS.EMPLOYER.VERIFY_EMAIL, {
        email: emailStored,
        code: codeString,
      });
      const msg =
        (res.data &&
          typeof res.data === "object" &&
          "message" in res.data &&
          typeof (res.data as { message?: string }).message === "string" &&
          (res.data as { message: string }).message) ||
        "Email verified.";
      toast.success(msg);
      setStep(3);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: unknown } };
      toast.error(formatApiErrors(ax.response?.data));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleIndustry = (id: number) => {
    setSelectedIndustryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !description.trim()) {
      toast.error("Company name and description are required.");
      return;
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
      const loginRes = await apiClient.post(API_ENDPOINTS.EMPLOYER.LOGIN, {
        email: emailStored,
        password: passwordStored,
      });
      const token =
        loginRes.data?.access || loginRes.data?.token;
      const refresh =
        loginRes.data?.refresh || loginRes.data?.refresh_token;
      if (!token) {
        toast.error(
          "Could not sign you in. Please try logging in from the login page.",
        );
        return;
      }
      TokenManager.setTokens(token, refresh || "");
      localStorage.setItem("userRole", "employer");

      const selectedNames = industries
        .filter((i) => selectedIndustryIds.includes(i.id))
        .map((i) => i.name);

      await apiClient.patch(API_ENDPOINTS.EMPLOYER.PROFILE, {
        company_name: companyName.trim(),
        name: companyName.trim(),
        first_name: companyName.trim(),
        description: description.trim(),
        phone_number: phoneNumber,
        website: website.trim(),
        locations,
        number_of_employees: numberOfEmployees,
        industries: selectedIndustryIds,
        industry_names: selectedNames,
      });

      sessionStorage.removeItem("tempEmployerEmail");
      sessionStorage.removeItem("tempEmployerPassword");

      toast.success("Profile saved. Welcome!");
      window.location.href = getLocalizedPath("/employer/home", language);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: unknown } };
      toast.error(formatApiErrors(ax.response?.data));
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
                ? "Work email & password"
                : step === 2
                  ? "Verify your email"
                  : "Company details"}
            </p>

            {step === 1 && (
              <form onSubmit={handleStep1} className="space-y-4">
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
                  Enter the 6-digit code sent to{" "}
                  <strong>
                    {sessionStorage.getItem("tempEmployerEmail") || email}
                  </strong>
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
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleStep3} className="space-y-4">
                <div>
                  <Label htmlFor="co-name">Company name</Label>
                  <Input
                    id="co-name"
                    className="mt-1 h-[3rem]"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
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
                  <ScrollArea className="h-40 border rounded-md mt-1 p-3">
                    {industries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No industries loaded.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {industries.map((ind) => (
                          <label
                            key={ind.id}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedIndustryIds.includes(ind.id)}
                              onCheckedChange={() => toggleIndustry(ind.id)}
                              disabled={isLoading}
                            />
                            <span>{ind.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-[#00BFFF] text-white hover:bg-[#00BFFF]/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Saving…" : "Finish & go to dashboard"}
                </Button>
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
