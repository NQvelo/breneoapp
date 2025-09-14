import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import PhoneInput from "react-phone-number-input";
import type { Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, Building2 } from "lucide-react";

interface AuthFormProps {
  initialRole?: "student" | "academy";
  initialIsSignUp?: boolean;
  onRequestSignUp?: () => void;
  onRequestSignIn?: () => void;
}

export function AuthForm({
  initialRole,
  initialIsSignUp,
  onRequestSignUp,
  onRequestSignIn,
}: AuthFormProps = {}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState<string | undefined>("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [isSignUp, setIsSignUp] = useState(initialIsSignUp ?? false);
  const [isAcademySignUp, setIsAcademySignUp] = useState(
    initialRole === "academy"
  );
  const [academyName, setAcademyName] = useState("");
  const [academyDescription, setAcademyDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [academyStep, setAcademyStep] = useState<"name" | "details">("name");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp, signUpAcademy, resetPassword } = useAuth();

  // Auto-detect country for phone input
  const [defaultCountry, setDefaultCountry] = useState<Country>("GE");

  useEffect(() => {
    // Set country based on browser locale only (no location permission)
    try {
      const locale =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigator.language || (navigator as any).userLanguage || "";
      const match = locale.match(/-([A-Z]{2})/i);
      if (match && match[1]) {
        setDefaultCountry(match[1].toUpperCase() as Country);
      }
    } catch {
      // Keep default 'GE' if detection fails
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (!error) {
      navigate("/dashboard");
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signUp(email, password, name);

    if (!error) {
      // Don't navigate immediately - user needs to verify email
      setEmail("");
      setPassword("");
      setName("");
      setPhone("");
    }

    setLoading(false);
  };

  const handleAcademySignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const academyData = {
      academyName,
      description: academyDescription,
      websiteUrl,
      contactEmail: contactEmail || email,
    };

    const { error } = await signUpAcademy(email, password, academyData);

    if (!error) {
      // Don't navigate immediately - user needs to verify email
      setEmail("");
      setPassword("");
      setAcademyName("");
      setAcademyDescription("");
      setWebsiteUrl("");
      setContactEmail("");
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setForgotPasswordLoading(true);
    await resetPassword(email);
    setForgotPasswordLoading(false);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="border-0 bg-white rounded-2xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-foreground mb-2">
              {isSignUp
                ? isAcademySignUp
                  ? "Academy Registration"
                  : "Create Account"
                : isForgotPassword
                ? "Forgot Password"
                : "Welcome Back"}
            </h1>
            <p className="text-muted-foreground">
              {isSignUp
                ? isAcademySignUp
                  ? "Register your academy on Breneo"
                  : "Sign up for your Breneo account"
                : isForgotPassword
                ? "Enter your email to receive a password recovery link"
                : "Sign in to your Breneo account"}
            </p>
          </div>

          {!isSignUp && !isForgotPassword ? (
            <form onSubmit={handleSignIn} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground"
                >
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 rounded-[14px]"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 pr-10 rounded-[14px]"
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
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm text-breneo-blue hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-breneo-blue hover:bg-breneo-blue/90 text-white font-medium"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>

              <div className="text-center pt-4">
                <span className="text-muted-foreground">
                  Don't have an account?{" "}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onRequestSignUp ? onRequestSignUp() : setIsSignUp(true)
                  }
                  className="text-breneo-blue hover:underline font-medium"
                >
                  Sign up
                </button>
              </div>
            </form>
          ) : !isSignUp && isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="forgot-email"
                  className="text-sm font-medium text-foreground"
                >
                  Email Address
                </label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={forgotPasswordLoading}
                  className="h-12 rounded-[14px]"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-breneo-blue hover:bg-breneo-blue/90 text-white font-medium"
                disabled={forgotPasswordLoading || !email}
              >
                {forgotPasswordLoading ? "Sending..." : "Send Recovery Link"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-sm text-breneo-blue hover:underline font-medium"
                >
                  Back to sign in
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {!isAcademySignUp ? (
                <form onSubmit={handleSignUp} className="space-y-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="name"
                      className="text-sm font-medium text-foreground"
                    >
                      Full Name
                    </label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={loading}
                      className="h-12 rounded-[14px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="signup-email"
                      className="text-sm font-medium text-foreground"
                    >
                      Email Address
                    </label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="h-12 rounded-[14px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="phone"
                      className="text-sm font-medium text-foreground"
                    >
                      Phone Number
                    </label>
                    <PhoneInput
                      id="phone"
                      placeholder="Enter your phone number"
                      value={phone}
                      onChange={setPhone}
                      defaultCountry={defaultCountry}
                      international
                      countryCallingCodeEditable={false}
                      disabled={loading}
                      className="flex h-12 w-full rounded-[14px] border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="signup-password"
                      className="text-sm font-medium text-foreground"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        disabled={loading}
                        className="h-12 pr-10 rounded-[14px]"
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
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-breneo-blue hover:bg-breneo-blue/90 text-white font-medium"
                    disabled={loading}
                  >
                    {loading ? "Creating Account..." : "Sign Up"}
                  </Button>

                  <div className="text-center pt-4">
                    <span className="text-muted-foreground">
                      Already have an account?{" "}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onRequestSignIn ? onRequestSignIn() : setIsSignUp(false)
                      }
                      className="text-breneo-blue hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  {academyStep === "name" ? (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h2 className="text-2xl font-semibold text-foreground mb-2">
                          Create Your Academy
                        </h2>
                        <p className="text-muted-foreground">
                          Set up your academy account to manage your courses
                        </p>
                      </div>

                      <div className="bg-card rounded-lg border p-6">
                        <div className="flex items-start space-x-3 mb-6">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground mb-1">
                              Academy Information
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              This information will be used to set up your
                              academy account
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="academy-name"
                            className="text-sm font-medium text-foreground"
                          >
                            Academy Name
                          </label>
                          <Input
                            id="academy-name"
                            type="text"
                            placeholder="Enter your academy name"
                            value={academyName}
                            onChange={(e) => setAcademyName(e.target.value)}
                            required
                            disabled={loading}
                            className="h-12 rounded-[14px]"
                          />
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 h-12"
                          onClick={() => setIsSignUp(false)}
                          disabled={loading}
                        >
                          Back
                        </Button>
                        <Button
                          type="button"
                          className="flex-1 h-12 bg-breneo-blue hover:bg-breneo-blue/90 text-white"
                          onClick={() => setAcademyStep("details")}
                          disabled={loading || !academyName.trim()}
                        >
                          Continue
                        </Button>
                      </div>

                      <div className="text-center pt-4">
                        <span className="text-muted-foreground">
                          Already have an account?{" "}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onRequestSignIn
                              ? onRequestSignIn()
                              : setIsSignUp(false)
                          }
                          className="text-breneo-blue hover:underline font-medium"
                        >
                          Sign in
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleAcademySignUp} className="space-y-6">
                      <div className="text-center mb-6">
                        <h2 className="text-2xl font-semibold text-foreground mb-2">
                          Complete Your Academy Setup
                        </h2>
                        <p className="text-muted-foreground">
                          Academy:{" "}
                          <span className="font-medium text-foreground">
                            {academyName}
                          </span>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="academy-email"
                          className="text-sm font-medium text-foreground"
                        >
                          Email Address
                        </label>
                        <Input
                          id="academy-email"
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={loading}
                          className="h-12 rounded-[14px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="academy-description"
                          className="text-sm font-medium text-foreground"
                        >
                          Description
                        </label>
                        <Input
                          id="academy-description"
                          type="text"
                          placeholder="Brief description of your academy"
                          value={academyDescription}
                          onChange={(e) =>
                            setAcademyDescription(e.target.value)
                          }
                          disabled={loading}
                          className="h-12 rounded-[14px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="website-url"
                          className="text-sm font-medium text-foreground"
                        >
                          Website URL (optional)
                        </label>
                        <Input
                          id="website-url"
                          type="url"
                          placeholder="https://your-academy.com"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          disabled={loading}
                          className="h-12 rounded-[14px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="academy-password"
                          className="text-sm font-medium text-foreground"
                        >
                          Password
                        </label>
                        <div className="relative">
                          <Input
                            id="academy-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            disabled={loading}
                            className="h-12 pr-10 rounded-[14px]"
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
                      </div>

                      <div className="flex space-x-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 h-12"
                          onClick={() => setAcademyStep("name")}
                          disabled={loading}
                        >
                          Back
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1 h-12 bg-breneo-blue hover:bg-breneo-blue/90 text-white font-medium"
                          disabled={loading}
                        >
                          {loading
                            ? "Registering Academy..."
                            : "Register Academy"}
                        </Button>
                      </div>

                      <div className="text-center pt-4">
                        <span className="text-muted-foreground">
                          Already have an account?{" "}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onRequestSignIn
                              ? onRequestSignIn()
                              : setIsSignUp(false)
                          }
                          className="text-breneo-blue hover:underline font-medium"
                        >
                          Sign in
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
