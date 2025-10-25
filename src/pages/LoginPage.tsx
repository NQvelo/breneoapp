import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios"; // ✅ Required for error type checking
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner"; // ✅ Required for error toasts
import { useAuth } from "@/contexts/AuthContext"; // ✅ IMPORT USEAUTH

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading: authLoading } = useAuth();

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  // ✅ Handle login (NOW WITH MORE ROBUST ERROR HANDLING)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login(emailOrUsername, password);
      // Success logic (navigation, etc.) is handled by the AuthContext
    } catch (err: unknow) {
      // ✅ START: Improved error handling
      let errorMessage = "Login failed. Please try again.";
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
        toast.info(
          "Your account is not verified. Redirecting to verification..."
        );
        sessionStorage.setItem("tempEmail", emailOrUsername);
        sessionStorage.setItem("tempPassword", password);
        navigate("/auth/email-verification");
      } else {
        // This is a standard login fail (e.g., wrong password)
        toast.error(errorMessage);

        // ✅ NEW: Log the server's response data for debugging
        console.error(
          "Login page caught error (see details below):",
          err instanceof Error ? err.message : String(err)
        );
        if (axios.isAxiosError(err) && err.response) {
          console.error("Server response data:", err.response.data);
        }
      }
      // ✅ END: Improved error handling
    }
  };

  const isLoading = authLoading;

  return (
    <div className="min-h-screen flex">
      {/* Left Section (Form) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <img
              src="/lovable-uploads/breneo_logo.png"
              alt="Breneo Logo"
              className="h-10"
            />
          </div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Sign In</h1>
          <p className="text-gray-600 mb-8">
            Welcome back to your Breneo account
          </p>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Label htmlFor="emailOrUsername">Email or Username</Label>
              <Input
                id="emailOrUsername"
                type="text"
                placeholder="Enter your email or username"
                className="mt-1 h-12"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="pr-10 h-12"
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
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
          <p className="text-center text-gray-600 mt-8">
            Don't have an account?{" "}
            <button
              type="button"
              className="text-[#00BFFF] hover:underline"
              onClick={() => navigate("/auth/signup")}
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>

      {/* Right Section (Image) */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-5">
        <div
          className="w-full h-full bg-cover bg-center bg-no-repeat rounded-xl"
          style={{ backgroundImage: "url('/lovable-uploads/future.png')" }}
        ></div>
      </div>
    </div>
  );
};

export default LoginPage;
