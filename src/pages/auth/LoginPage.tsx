import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios"; // ✅ Required for error type checking
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "@/components/icons";
import { toast } from "sonner"; // ✅ Required for error toasts
import { useAuth } from "@/contexts/AuthContext"; // ✅ IMPORT USEAUTH
import { AuthCoverImage } from "@/components/auth/AuthCoverImage";
import { AuthPageHeader } from "@/components/auth/AuthPageHeader";
import { AuthLegalNotice } from "@/components/auth/AuthLegalNotice";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { TokenManager } from "@/api/auth/tokenManager";
import { getLocalizedPath, getLanguageFromPath } from "@/utils/localeUtils";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import { useTranslation } from "@/contexts/LanguageContext";
import { DIRECT_REGISTER_KEY } from "@/onboarding/onboardingAnswers";

const SAVE_LOGIN_KEY = "saveLogin";
const SAVED_EMAIL_KEY = "savedLoginEmail";

const savePasswordInitial = () =>
  localStorage.getItem(SAVE_LOGIN_KEY) !== "false";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading: authLoading, user } = useAuth();
  const t = useTranslation();

  const [savePassword, setSavePassword] = useState(savePasswordInitial);
  const [emailOrUsername, setEmailOrUsername] = useState(() =>
    savePasswordInitial() ? localStorage.getItem(SAVED_EMAIL_KEY) || "" : "",
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Redirect already-authenticated users to their dashboard
  useEffect(() => {
    if (!authLoading && user) {
      const userRole =
        user.user_type || localStorage.getItem("userRole") || "user";
      const language =
        getLanguageFromPath(window.location.pathname) ||
        (localStorage.getItem("appLanguage") as "en" | "ka") ||
        "en";
      if (userRole === "academy") {
        const academyPath = getLocalizedPath("/academy/dashboard", language);
        navigate(academyPath, { replace: true });
      } else if (userRole === "employer") {
        const employerPath = getLocalizedPath("/employer/jobs", language);
        navigate(employerPath, { replace: true });
      } else {
        const homePath = getLocalizedPath("/home", language);
        navigate(homePath, { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  // Set page title and meta
  useEffect(() => {
    document.title = "Login | Breneo";

    const descTag =
      document.querySelector('meta[name="description"]') ||
      (() => {
        const meta = document.createElement("meta");
        meta.setAttribute("name", "description");
        document.head.appendChild(meta);
        return meta;
      })();
    descTag.setAttribute("content", "Log in to your Breneo account.");

    const canonical =
      (document.querySelector('link[rel="canonical"]') as HTMLLinkElement) ||
      (() => {
        const link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
        return link;
      })();
    canonical.setAttribute("href", `${window.location.origin}/auth/login`);
  }, []);

  // Academy → employer → unified learner login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    localStorage.setItem(SAVE_LOGIN_KEY, String(savePassword));
    if (savePassword) {
      localStorage.setItem(SAVED_EMAIL_KEY, emailOrUsername.trim());
    } else {
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }

    try {
      const res = await apiClient.post(API_ENDPOINTS.AUTH.ACADEMY_LOGIN, {
        email: emailOrUsername,
        password,
      });

      const token = res.data.access || res.data.token;
      const refreshToken = res.data.refresh;

      if (!token) {
        throw new Error(
          "Login succeeded but did not return the required token.",
        );
      }

      if (refreshToken) {
        TokenManager.setTokens(token, refreshToken);
      } else {
        localStorage.setItem("authToken", token);
      }

      localStorage.setItem("userRole", "academy");
      window.location.href = "/academy/dashboard";
      return;
    } catch {
      /* try employer */
    }

    try {
      const res = await apiClient.post(API_ENDPOINTS.EMPLOYER.LOGIN, {
        email: emailOrUsername,
        password,
      });
      const token = res.data.access || res.data.token;
      const refreshToken = res.data.refresh || res.data.refresh_token;
      if (!token) {
        throw new Error(
          "Login succeeded but did not return the required token.",
        );
      }
      TokenManager.setTokens(token, refreshToken || "");
      localStorage.setItem("userRole", "employer");
      const language =
        getLanguageFromPath(window.location.pathname) ||
        (localStorage.getItem("appLanguage") as "en" | "ka") ||
        "en";
      window.location.href = getLocalizedPath("/employer/jobs", language);
      return;
    } catch {
      /* try unified login */
    }

    try {
      await login(emailOrUsername, password);
    } catch (err: unknown) {
      // ✅ START: Improved error handling
      let errorMessage = t.auth.loginFailed;
      let needsVerification = false;

      if (axios.isAxiosError(err) && err.response && err.response.data) {
        const errorData = err.response.data;
        let detail = "";

        // Try to find the error message in common response fields
        if (typeof errorData.detail === "string") detail = errorData.detail;
        else if (typeof errorData.message === "string")
          detail = errorData.message;
        else if (typeof errorData.error === "string") detail = errorData.error;
        // Check for Django REST Framework's default non-field errors
        else if (
          Array.isArray(errorData.non_field_errors) &&
          errorData.non_field_errors.length > 0 &&
          typeof errorData.non_field_errors[0] === "string"
        ) {
          detail = errorData.non_field_errors[0];
        }

        if (detail) {
          errorMessage = detail;
          const lowerCaseDetail = detail.toLowerCase();

          // Check for various "not verified" messages (case-insensitive)
          if (
            lowerCaseDetail.includes("email not verified") ||
            lowerCaseDetail.includes("account not active") ||
            lowerCaseDetail.includes("please verify your email") ||
            lowerCaseDetail.includes("e-mail address not verified") ||
            lowerCaseDetail.includes("user is inactive")
          ) {
            needsVerification = true;
          }
        } else {
          // If we can't parse the error, log it for debugging
          console.error("Unknown error format from server:", errorData);
        }
      }

      if (needsVerification) {
        // This is the flow you requested
        toast.info(t.auth.accountNotVerified);
        sessionStorage.setItem("tempEmail", emailOrUsername);
        sessionStorage.setItem("tempPassword", password);
        navigate("/auth/email-verification");
      } else {
        // This is a standard login fail (e.g., wrong password)
        toast.error(errorMessage);

        // ✅ NEW: Log the server's response data for debugging
        console.error(
          "Login page caught error (see details below):",
          err instanceof Error ? err.message : String(err),
        );
        if (axios.isAxiosError(err) && err.response) {
          console.error("Server response data:", err.response.data);
        }
      }
      // ✅ END: Improved error handling
    }
  };

  const hasStoredSession = Boolean(TokenManager.getAccessToken());

  if (authLoading && hasStoredSession) {
    return <AuthLoadingScreen message={t.auth.restoringSession} />;
  }

  if (user) {
    return <AuthLoadingScreen message={t.auth.openingDashboard} />;
  }

  const isLoading = authLoading;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1">
        <div className="w-full lg:w-1/2 flex flex-col bg-background">
          <AuthPageHeader />
          <div className="flex flex-1 items-center justify-center px-8 pb-8">
            <div className="w-full max-w-md">
              <h1 className="text-3xl font-semibold text-foreground mb-2">
                {t.auth.signIn}
              </h1>
              <p className="text-muted-foreground mb-8">
                {t.auth.signInSubtitle}
              </p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="emailOrUsername">{t.auth.emailAddress}</Label>
                  <Input
                    id="emailOrUsername"
                    type="text"
                    autoComplete={savePassword ? "username" : "off"}
                    placeholder="you@example.com"
                    className="mt-1 h-[3.2rem]"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label htmlFor="password">{t.auth.password}</Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={
                        savePassword ? "current-password" : "new-password"
                      }
                      placeholder={t.auth.passwordPlaceholder}
                      className="pr-10 h-[3.2rem]"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500 dark:text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500 dark:text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="savePassword"
                        checked={savePassword}
                        onCheckedChange={(checked) =>
                          setSavePassword(checked === true)
                        }
                        disabled={isLoading}
                      />
                      <Label
                        htmlFor="savePassword"
                        className="text-sm font-normal text-muted-foreground cursor-pointer"
                      >
                        {t.auth.savePassword}
                      </Label>
                    </div>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
                      onClick={() => navigate("/auth/reset-password")}
                    >
                      {t.auth.forgotPassword}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="!mt-8 w-full h-14"
                  disabled={isLoading}
                >
                  {isLoading ? t.auth.signingIn : t.auth.signIn}
                </Button>
              </form>
              <p className="text-center text-muted-foreground mt-8">
                {t.auth.dontHaveAccount}{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => {
                    sessionStorage.setItem(DIRECT_REGISTER_KEY, "1");
                    navigate("/auth/signup");
                  }}
                >
                  {t.auth.signup}
                </button>
              </p>
              {/* <p className="text-center text-muted-foreground mt-3 text-sm">
              Hiring company?{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => navigate("/employer/register")}
              >
                Register as employer
              </button>
            </p> */}
            </div>
          </div>
          <AuthLegalNotice />
        </div>

        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-5">
          <AuthCoverImage src="/lovable-uploads/cover_3.png" />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
