import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import axios from "axios";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ImageIcon } from "lucide-react";
import { BreneoLogo } from "@/components/common/BreneoLogo";

const EmailVerification: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Image loading states
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get email from state
  const email =
    location.state?.email ||
    sessionStorage.getItem("tempEmail") ||
    sessionStorage.getItem("tempAcademyEmail");
  const password = sessionStorage.getItem("tempPassword");
  const isAcademy = location.state?.isAcademy || false;

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
          preloadImage("/lovable-uploads/Breneo-logo.png"),
          preloadImage("/lovable-uploads/Breneo-logo-dark.png"),
          preloadImage("/lovable-uploads/future.png"),
        ]);
      } catch (error) {
        console.warn("Some images failed to preload:", error);
        setImageError(true);
      }
    };

    preloadImages();
  }, [preloadImage]);

  useEffect(() => {
    document.title = "Email Verification | Breneo";
  }, []);

  // ✅ Helper function for auto-login using AuthContext
  const loginAndNavigate = async () => {
    if (!email || !password) {
      toast.error("Session expired. Please log in manually.");
      navigate("/auth/login");
      return;
    }
    try {
      console.log("Attempting auto-login with:", {
        email,
        passwordLength: password.length,
      });

      // Use AuthContext login function instead of direct API call
      await login(email, password);

      toast.success("Email verified and logged in!");
      sessionStorage.removeItem("tempEmail");
      sessionStorage.removeItem("tempPassword");

      // Navigation is handled by AuthContext
    } catch (loginErr) {
      console.error("Auto-login failed:", loginErr);

      // More detailed error logging
      if (axios.isAxiosError(loginErr)) {
        console.error("Login error details:", {
          status: loginErr.response?.status,
          statusText: loginErr.response?.statusText,
          data: loginErr.response?.data,
          url: loginErr.config?.url,
          method: loginErr.config?.method,
        });
      }

      toast.error(
        "Verification successful, but auto-login failed. Please log in manually.",
      );
      navigate("/auth/login");
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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Email missing. Please register again.");
      navigate("/auth/signup");
      return;
    }

    const codeString = code.join("");
    if (codeString.length !== 6) {
      toast.error("Please enter a 6-digit code.");
      return;
    }

    setIsLoading(true);
    try {
      // Choose the correct API endpoint based on whether it's academy verification
      const verifyEndpoint = isAcademy
        ? API_ENDPOINTS.AUTH.VERIFY_ACADEMY_EMAIL
        : API_ENDPOINTS.AUTH.VERIFY_CODE;

      // Step 1: Try to verify email
      await apiClient.post(verifyEndpoint, {
        email,
        code: codeString,
      });

      // ✅ If verification succeeds
      if (isAcademy) {
        // For academy, just redirect to login page
        toast.success("Email verified successfully!");
        sessionStorage.removeItem("tempAcademyEmail");
        navigate("/auth/login");
      } else {
        // For regular users, proceed to auto-login if password is available
        if (password) {
          await loginAndNavigate();
        } else {
          toast.success("Email verified successfully!");
          sessionStorage.removeItem("tempEmail");
          navigate("/auth/login");
        }
      }
    } catch (err: unknown) {
      // Step 2: If verification fails, check *why*
      let errorMessage = "Verification failed. Please try again.";
      let isKnownBackendBug = false;

      if (axios.isAxiosError(err) && err.response) {
        const errorData = err.response.data;
        // Find the error detail string from various possible fields
        const detail =
          errorData.detail ||
          errorData.message ||
          errorData.error ||
          (Array.isArray(errorData.email) && errorData.email[0]) || // Check for field-specific errors
          "";

        errorMessage = typeof detail === "string" ? detail : errorMessage;

        // ✅ WORKAROUND: Check for the specific backend bug
        if (
          err.response.status === 400 &&
          errorMessage
            .toLowerCase()
            .includes("user with this email already exists")
        ) {
          isKnownBackendBug = true;
        }
      }

      // ✅ If it's the known bug, ignore it and try to log in anyway (only for regular users)
      if (isKnownBackendBug && !isAcademy && password) {
        toast.info("Verification processed, attempting login...");
        await loginAndNavigate();
      } else {
        // Otherwise, it's a real error (e.g., wrong code, or 404)
        toast.error(errorMessage);
      }
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
          {imageError && (
            <div className="h-5 w-16 bg-gray-100 dark:bg-[#242424] border border-gray-300 dark:border-gray-700 rounded flex items-center justify-center">
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
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
          <div className="w-full max-w-md">
            <div className="mb-8 hidden lg:flex items-center justify-between">
              <div className="flex items-center">
                {!logoLoaded && !imageError && (
                  <div className="h-8 w-24 bg-gray-200 dark:bg-[#242424] animate-pulse rounded flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-gray-400 dark:text-gray-600" />
                  </div>
                )}
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
                {imageError && (
                  <div className="h-8 w-24 bg-gray-100 dark:bg-[#242424] border border-gray-300 dark:border-gray-700 rounded flex items-center justify-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Breneo
                    </span>
                  </div>
                )}
              </div>
              <ThemeToggle />
            </div>

            <h1 className="text-3xl font-semibold text-foreground mb-2">
              Verify Your Email
            </h1>
            <p className="text-muted-foreground mb-8">
              Enter the 6-digit code sent to your email{" "}
              {isAcademy && "(academy registration)"} ({email || "your-email"})
            </p>

            <form onSubmit={handleVerify} className="space-y-6">
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
                      onChange={(e) => handleCodeChange(index, e.target.value)}
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
                {isLoading ? "Verifying..." : "Verify Email"}
              </Button>
            </form>

            <p className="text-center text-muted-foreground mt-8">
              Didn't receive a code?{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => navigate("/auth/login")}
              >
                Back to Login
              </button>
            </p>
          </div>
        </div>

        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-5">
          <div className="relative w-full h-full rounded-3xl overflow-hidden">
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

export default EmailVerification;
