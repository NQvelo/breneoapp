import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updatePassword } = useAuth();

  useEffect(() => {
    document.title = "Reset Password | Breneo";
    let descTag = document.querySelector('meta[name="description"]');
    if (!descTag) {
      descTag = document.createElement("meta");
      descTag.setAttribute("name", "description");
      document.head.appendChild(descTag);
    }
    descTag.setAttribute("content", "Reset your Breneo account password.");

    let canonical = document.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${window.location.origin}/reset-password`);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return;
    }

    if (password.length < 6) {
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(password);

    if (!error) {
      navigate("/dashboard");
    }

    setLoading(false);
  };

  const passwordsMatch = password === confirmPassword;
  const isValidPassword = password.length >= 6;
  const canSubmit =
    passwordsMatch && isValidPassword && password && confirmPassword;

  return (
    <div className="min-h-screen bg-breneo-lightgray flex flex-col">
      <header className="bg-white py-3 px-4 md:py-4 md:px-6 shadow-sm">
        <div className="container mx-auto">
          <a href="/" className="flex items-center space-x-2">
            <img
              src="/lovable-uploads/a27089ec-2666-4c11-a0e0-0d8ea54e1d39.png"
              alt="Breneo Logo"
              className="h-8 md:h-10"
            />
          </a>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center py-6 px-3 md:py-12 md:px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-foreground mb-2">
              Reset Password
            </h1>
            <p className="text-muted-foreground">
              Enter your new password below
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                New Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                  className="h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {password && !isValidPassword && (
                <p className="text-sm text-red-500">
                  Password must be at least 6 characters
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-foreground"
              >
                Repeat Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-sm text-red-500">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-breneo-blue hover:bg-breneo-blue/90 text-white font-medium"
              disabled={loading || !canSubmit}
            >
              {loading ? "Updating Password..." : "Update Password"}
            </Button>
          </form>
        </div>
      </main>

      <footer className="bg-white py-3 px-4 md:py-4 md:px-6 border-t">
        <div className="container mx-auto">
          <p className="text-xs md:text-sm text-gray-500 text-center">
            © {new Date().getFullYear()} Breneo. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ResetPasswordPage;
