import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const EmailVerification: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Get email from state
  const email = location.state?.email || sessionStorage.getItem("tempEmail");
  const password = sessionStorage.getItem("tempPassword");

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
      // Use AuthContext login function instead of direct API call
      await login(email, password);

      toast.success("Email verified and logged in!");
      sessionStorage.removeItem("tempEmail");
      sessionStorage.removeItem("tempPassword");

      // Navigation is handled by AuthContext
    } catch (loginErr) {
      console.error("Auto-login failed:", loginErr);
      toast.error(
        "Verification successful, but auto-login failed. Please log in manually."
      );
      navigate("/auth/login");
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email or password missing. Please register again.");
      navigate("/auth/signup");
      return;
    }

    if (code.length !== 6) {
      toast.error("Please enter a 6-digit code.");
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Try to verify email
      await axios.post("https://breneo.onrender.com/api/verify-code/", {
        email,
        code,
      });

      // ✅ If verification succeeds (no error), proceed to login
      await loginAndNavigate();
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

      // ✅ If it's the known bug, ignore it and try to log in anyway
      if (isKnownBackendBug) {
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
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <img
              src="/lovable-uploads/breneo_logo.png" // Use root path
              alt="Breneo Logo"
              className="h-10"
            />
          </div>

          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Verify Your Email
          </h1>
          <p className="text-gray-600 mb-8">
            Enter the 6-digit code sent to your email ({email || "your-email"})
          </p>

          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <Label htmlFor="code">6-Digit Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="Enter code"
                className="mt-1 h-12 tracking-widest text-center text-xl"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/, ""))}
                maxLength={6}
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-14 bg-[#00BFFF] text-white hover:bg-[#00BFFF]/90"
              disabled={isLoading}
            >
              {isLoading ? "Verifying..." : "Verify Email"}
            </Button>
          </form>

          <p className="text-center text-gray-600 mt-8">
            Didn't receive a code?{" "}
            <button
              type="button"
              className="text-[#00BFFF] hover:underline"
              onClick={() => navigate("/auth/login")}
            >
              Back to Login
            </button>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-5">
        <div
          className="w-full h-full bg-cover bg-center bg-no-repeat rounded-xl"
          style={{ backgroundImage: `url('/lovable-uploads/future.png')` }} // Use root path
        ></div>
      </div>
    </div>
  );
};

export default EmailVerification;
