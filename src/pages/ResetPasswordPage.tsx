import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { ImageIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const API_BASE = "https://breneo.onrender.com";

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Image loading states
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Image preloading function
  const preloadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }, []);

  // Preload images on component mount
  useEffect(() => {
    const preloadImages = async () => {
      try {
        await Promise.all([
          preloadImage("/lovable-uploads/breneo_logo.png"),
          preloadImage("/lovable-uploads/future.png"),
        ]);
      } catch (error) {
        console.warn("Some images failed to preload:", error);
        setImageError(true);
      }
    };

    preloadImages();
  }, [preloadImage]);

  // Set page title
  useEffect(() => {
    document.title = "Reset Password | Breneo";
  }, []);

  // =========================
  // Step 1: Send Code
  // =========================
  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/password-reset/request/`, {
        email,
      });
      toast.success(res.data.message || "Code sent to your email!");
      setStep(2);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Error sending code");
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
      toast.error("Please enter a 6-digit code.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/password-reset/verify/`, {
        email,
        code: codeString,
      });
      toast.success(res.data.message || "Code verified!");
      setStep(3);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Invalid code");
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
    e: React.KeyboardEvent<HTMLInputElement>
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
      toast.error("Passwords do not match");
      return;
    }
    setIsLoading(true);
    try {
      const codeString = code.join("");
      const res = await axios.post(`${API_BASE}/password-reset/set-new/`, {
        email,
        code: codeString,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      toast.success(res.data.message || "Password reset successfully!");
      navigate("/auth/login"); // Redirect to login on success
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Error setting new password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-transparent border-b border-gray-200 dark:border-border">
        <div className="flex items-center">
          {!logoLoaded && !imageError && (
            <div className="h-7 w-20 bg-gray-200 dark:bg-[#242424] animate-pulse rounded flex items-center justify-center">
              <ImageIcon className="h-3 w-3 text-gray-400 dark:text-gray-600" />
            </div>
          )}
          <img
            src="/lovable-uploads/breneo_logo.png"
            alt="Breneo Logo"
            className={`h-7 transition-opacity duration-300 ${
              logoLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setLogoLoaded(true)}
            onError={() => {
              setImageError(true);
              setLogoLoaded(true);
            }}
          />
          {imageError && (
            <div className="h-7 w-20 bg-gray-100 dark:bg-[#242424] border border-gray-300 dark:border-gray-700 rounded flex items-center justify-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Breneo
              </span>
            </div>
          )}
        </div>
        <ThemeToggle />
      </div>

      {/* Content Section */}
      <div className="flex flex-1">
        {/* Left Section (Form) */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
          <div className="w-full max-w-md">
            <div className="mb-8 hidden lg:flex items-center justify-between">
              <div className="flex items-center">
                {!logoLoaded && !imageError && (
                  <div className="h-10 w-32 bg-gray-200 dark:bg-[#242424] animate-pulse rounded flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-gray-400 dark:text-gray-600" />
                  </div>
                )}
                <img
                  src="/lovable-uploads/breneo_logo.png"
                  alt="Breneo Logo"
                  className={`h-10 transition-opacity duration-300 ${
                    logoLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={() => setLogoLoaded(true)}
                  onError={() => {
                    setImageError(true);
                    setLogoLoaded(true);
                  }}
                />
                {imageError && (
                  <div className="h-10 w-32 bg-gray-100 dark:bg-[#242424] border border-gray-300 dark:border-gray-700 rounded flex items-center justify-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Breneo
                    </span>
                  </div>
                )}
              </div>
              <ThemeToggle />
            </div>

            <h1 className="text-3xl font-semibold text-foreground mb-2">
              Reset Password
            </h1>

            {/* Step 1: Enter Email */}
            {step === 1 && (
              <>
                <p className="text-muted-foreground mb-8">
                  Enter your email to receive a verification code.
                </p>
                <form onSubmit={sendCode} className="space-y-6">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="mt-1 h-12"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-14 bg-[#00BFFF] text-white hover:bg-[#00BFFF]/90"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending Code..." : "Send Code"}
                  </Button>
                </form>
              </>
            )}

            {/* Step 2: Enter Code */}
            {step === 2 && (
              <>
                <p className="text-muted-foreground mb-8">
                  A code was sent to {email}. Please enter it below.
                </p>
                <form onSubmit={verifyCode} className="space-y-6">
                  <div className="w-full sm:w-[23.5rem]">
                    <div className="flex gap-2 sm:gap-2">
                      {code.map((digit, index) => (
                        <Input
                          key={index}
                          ref={(el) => (inputRefs.current[index] = el)}
                          type="text"
                          inputMode="numeric"
                          className="flex-1 sm:flex-none h-12 sm:h-14 w-0 sm:w-14 text-center text-xl sm:text-2xl font-semibold"
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
                    className="w-full sm:w-[23.5rem] h-12 sm:h-14 bg-[#00BFFF] text-white hover:bg-[#00BFFF]/90"
                    disabled={isLoading}
                  >
                    {isLoading ? "Verifying..." : "Verify Code"}
                  </Button>
                </form>
              </>
            )}

            {/* Step 3: Set New Password */}
            {step === 3 && (
              <>
                <p className="text-muted-foreground mb-8">
                  Enter your new password.
                </p>
                <form onSubmit={setNewPasswordHandler} className="space-y-6">
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative mt-1">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        className="pr-10 h-12"
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
                      Confirm New Password
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        className="pr-10 h-12"
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
                    className="w-full h-14 bg-[#00BFFF] text-white hover:bg-[#00BFFF]/90"
                    disabled={isLoading}
                  >
                    {isLoading ? "Setting..." : "Set New Password"}
                  </Button>
                </form>
              </>
            )}

            <p className="text-center text-muted-foreground mt-8">
              Remembered your password?{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => navigate("/auth/login")}
              >
                Sign In
              </button>
            </p>
          </div>
        </div>

        {/* Right Section (Image) */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-5">
          <div className="relative w-full h-full rounded-xl overflow-hidden">
            {/* Loading skeleton */}
            {!backgroundLoaded && !imageError && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#242424] dark:to-[#2a2a2a] animate-pulse flex items-center justify-center">
                <ImageIcon className="h-16 w-16 text-gray-400 dark:text-gray-600" />
              </div>
            )}

            {/* Background image */}
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

            {/* Hidden image for loading detection */}
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

            {/* Error fallback */}
            {imageError && (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-[#1a1a1a] dark:to-[#2a2a2a] flex items-center justify-center">
                <div className="text-center text-blue-600 dark:text-gray-400">
                  <ImageIcon className="h-16 w-16 mx-auto mb-2" />
                  <p className="text-sm">Future Technology</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
