import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const EmailVerification: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Get email from state
  const email = location.state?.email || sessionStorage.getItem("tempEmail");
  const password = sessionStorage.getItem("tempPassword");

  useEffect(() => {
    document.title = "Email Verification | Breneo";
  }, []);

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
      // Verify email
      await axios.post("https://breneo.onrender.com/api/verify-code/", {
        email,
        code,
      });

      // Auto-login
      const loginResp = await axios.post(
        "https://breneo.onrender.com/api/login/",
        { username: email, password }
      );

      localStorage.setItem("authToken", loginResp.data.token);

      toast.success("Email verified and logged in!");
      sessionStorage.removeItem("tempEmail");
      sessionStorage.removeItem("tempPassword");

      navigate("/dashboard");
    } catch (err: any) {
      let errorMessage = "Verification failed. Please try again.";
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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <img
              src="lovable-uploads/breneo_logo.png"
              alt="Breneo Logo"
              className="h-10"
            />
          </div>

          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Verify Your Email
          </h1>
          <p className="text-gray-600 mb-8">
            Enter the 6-digit code sent to your email ({email})
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
          style={{ backgroundImage: `url('/lovable-uploads/future.png')` }}
        ></div>
      </div>
    </div>
  );
};

export default EmailVerification;
