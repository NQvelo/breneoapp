import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "@/components/icons";
import { toast } from "sonner";
import { AuthCoverImage } from "@/components/auth/AuthCoverImage";
import { AuthPageHeader } from "@/components/auth/AuthPageHeader";
import { AuthLegalNotice } from "@/components/auth/AuthLegalNotice";
import { useTranslation } from "@/contexts/LanguageContext";
import { API_BASE_URL } from "@/api/auth/config";

const serverError = (err: unknown): string | undefined =>
  axios.isAxiosError(err) ? err.response?.data?.error : undefined;

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useTranslation();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    document.title = t.resetPassword.pageTitle;
  }, [t]);

  // =========================
  // Step 1: Send Code
  // =========================
  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/password-reset/request/`, {
        email,
      });
      toast.success(t.resetPassword.codeSent);
      setStep(2);
    } catch (err: unknown) {
      toast.error(serverError(err) || t.resetPassword.sendError);
    } finally {
      setIsLoading(false);
    }
  };

  // =========================
  // Step 2: Verify Code
  // =========================
  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeString = code.join("");
    if (codeString.length !== 6) {
      toast.error(t.resetPassword.enterCode);
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/password-reset/verify/`, {
        email,
        code: codeString,
      });
      toast.success(t.resetPassword.codeVerified);
      setStep(3);
    } catch (err: unknown) {
      toast.error(serverError(err) || t.resetPassword.invalidCode);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    // Handle backspace to go to previous input
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // =========================
  // Step 3: Set New Password
  // =========================
  const setNewPasswordHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t.resetPassword.passwordsMismatch);
      return;
    }
    setIsLoading(true);
    try {
      const codeString = code.join("");
      await axios.post(`${API_BASE_URL}/password-reset/set-new/`, {
        email,
        code: codeString,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      toast.success(t.resetPassword.resetSuccess);
      navigate("/auth/login"); // Redirect to login on success
    } catch (err: unknown) {
      toast.error(serverError(err) || t.resetPassword.resetError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1">
        <div className="w-full lg:w-1/2 flex flex-col bg-background">
          <AuthPageHeader />
          <div className="flex flex-1 items-center justify-center px-8 pb-8">
            <div className="w-full max-w-md">
              <h1 className="text-3xl font-semibold text-foreground mb-2">
                {t.resetPassword.title}
              </h1>

              {/* Step 1: Enter Email */}
              {step === 1 && (
                <>
                  <p className="text-muted-foreground mb-8">
                    {t.resetPassword.step1Subtitle}
                  </p>
                  <form onSubmit={sendCode} className="space-y-4">
                    <div>
                      <Label htmlFor="email">{t.auth.emailAddress}</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t.resetPassword.emailPlaceholder}
                        className="mt-1 h-[3.2rem]"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="!mt-8 w-full h-14 bg-[#00BFFF] text-white hover:bg-[#00BFFF]/90"
                      disabled={isLoading}
                    >
                      {isLoading
                        ? t.resetPassword.sendingCode
                        : t.resetPassword.sendCode}
                    </Button>
                  </form>
                </>
              )}

              {/* Step 2: Enter Code */}
              {step === 2 && (
                <>
                  <p className="text-muted-foreground mb-8">
                    {t.resetPassword.step2Subtitle.replace("{email}", email)}
                  </p>
                  <form onSubmit={verifyCode} className="space-y-4">
                    <div className="w-full sm:w-[23.5rem]">
                      <div className="flex gap-2 sm:gap-2">
                        {code.map((digit, index) => (
                          <Input
                            key={index}
                            ref={(el) => (inputRefs.current[index] = el)}
                            type="text"
                            inputMode="numeric"
                            className="flex-1 sm:flex-none h-[3.2rem] w-0 sm:w-14 text-center text-xl sm:text-2xl font-semibold"
                            value={digit}
                            onChange={(e) =>
                              handleCodeChange(index, e.target.value)
                            }
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            maxLength={1}
                            required
                            disabled={isLoading}
                            autoFocus={index === 0}
                          />
                        ))}
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="!mt-8 w-full sm:w-[23.5rem] h-12 sm:h-14 bg-[#00BFFF] text-white hover:bg-[#00BFFF]/90"
                      disabled={isLoading}
                    >
                      {isLoading
                        ? t.resetPassword.verifying
                        : t.resetPassword.verifyCode}
                    </Button>
                  </form>
                </>
              )}

              {/* Step 3: Set New Password */}
              {step === 3 && (
                <>
                  <p className="text-muted-foreground mb-8">
                    {t.resetPassword.step3Subtitle}
                  </p>
                  <form onSubmit={setNewPasswordHandler} className="space-y-4">
                    <div>
                      <Label htmlFor="newPassword">
                        {t.resetPassword.newPassword}
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          placeholder={t.resetPassword.newPasswordPlaceholder}
                          className="pr-10 h-[3.2rem]"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          disabled={isLoading}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-500" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">
                        {t.resetPassword.confirmPassword}
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder={
                            t.resetPassword.confirmPasswordPlaceholder
                          }
                          className="pr-10 h-[3.2rem]"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          disabled={isLoading}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-500" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="!mt-8 w-full h-14 bg-[#00BFFF] text-white hover:bg-[#00BFFF]/90"
                      disabled={isLoading}
                    >
                      {isLoading
                        ? t.resetPassword.setting
                        : t.resetPassword.setNewPassword}
                    </Button>
                  </form>
                </>
              )}

              <p className="text-center text-muted-foreground mt-8">
                {t.resetPassword.remembered}{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => navigate("/auth/login")}
                >
                  {t.auth.signIn}
                </button>
              </p>
            </div>
          </div>
          <AuthLegalNotice />
        </div>

        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-5">
          <AuthCoverImage src="/lovable-uploads/future.png" />
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
