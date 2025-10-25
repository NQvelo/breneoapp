import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const API_BASE = "https://breneo.onrender.com";

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/password-reset/verify/`, {
        email,
        code,
      });
      toast.success(res.data.message || "Code verified!");
      setStep(3);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Invalid code");
    } finally {
      setIsLoading(false);
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
      const res = await axios.post(`${API_BASE}/password-reset/set-new/`, {
        email,
        code,
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
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Reset Password
          </h1>

          {/* Step 1: Enter Email */}
          {step === 1 && (
            <>
              <p className="text-gray-600 mb-8">
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
              <p className="text-gray-600 mb-8">
                A code was sent to {email}. Please enter it below.
              </p>
              <form onSubmit={verifyCode} className="space-y-6">
                <div>
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="Enter 6-digit code"
                    className="mt-1 h-12"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-14 bg-[#00BFFF] text-white hover:bg-[#00BFFF]/90"
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
              <p className="text-gray-600 mb-8">Enter your new password.</p>
              <form onSubmit={setNewPasswordHandler} className="space-y-6">
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    className="mt-1 h-12"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    className="mt-1 h-12"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
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

          <p className="text-center text-gray-600 mt-8">
            Remembered your password?{" "}
            <button
              type="button"
              className="text-[#00BFFF] hover:underline"
              onClick={() => navigate("/auth/login")}
            >
              Sign In
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

export default ResetPasswordPage;
