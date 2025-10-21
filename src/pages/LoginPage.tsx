import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1️⃣ Login
      const response = await axios.post(
        "https://breneo.onrender.com/api/login/",
        { username: emailOrUsername, password }
      );

      const { token } = response.data;
      localStorage.setItem("authToken", token);

      // 2️⃣ Check if temporary academy user
      const tempRes = await axios.get(
        `https://breneo.onrender.com/api/verify-academy-email/?email=${encodeURIComponent(
          emailOrUsername
        )}`
      );
      const isTemporary = tempRes.data?.is_temporary === true;

      if (isTemporary) {
        toast.info("Please verify your email before accessing Breneo.");
        navigate("/auth/email-verification");
        return;
      }

      // 3️⃣ Otherwise, proceed to dashboard
      toast.success("Logged in successfully!");
      navigate("/dashboard");
    } catch (err: any) {
      let errorMessage = "Login failed. Please try again.";
      if (axios.isAxiosError(err) && err.response) {
        errorMessage =
          err.response.data.detail ||
          err.response.data.message ||
          err.response.data.error ||
          errorMessage;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
