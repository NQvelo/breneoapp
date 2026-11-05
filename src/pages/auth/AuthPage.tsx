import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ImageIcon } from "@/components/icons";
import { CountrySelector } from "@/components/ui/CountrySelector";
import { Country, countries } from "@/data/countries";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import axios from "axios";
import { AuthPageHeader } from "@/components/auth/AuthPageHeader";
import { AuthLegalNotice } from "@/components/auth/AuthLegalNotice";
import { useTranslation } from "@/contexts/LanguageContext";

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(
    countries.find((c) => c.code === "GE"),
  );

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Image loading states
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
          preloadImage("/lovable-uploads/Breneo-logo.png"),
          preloadImage("/lovable-uploads/Breneo-logo-dark.png"),
          preloadImage("/lovable-uploads/way.png"),
        ]);
      } catch (error) {
        console.warn("Some images failed to preload:", error);
        setImageError(true);
      }
    };

    preloadImages();
  }, [preloadImage]);

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    const phoneNumber = `${selectedCountry?.dial_code}${phone}`;

    try {
      await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone_number: phoneNumber,
        password: password,
      });

      // Save email & password temporarily for auto-login
      sessionStorage.setItem("tempEmail", email);
      sessionStorage.setItem("tempPassword", password);

      navigate("/email-verification");
      toast.success(t.auth.registrationSuccess);
    } catch (err: unknown) {
      let errorMessage = t.auth.registrationFailed;
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
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1">
        <div className="w-full lg:w-1/2 flex flex-col bg-background">
          <AuthPageHeader />

          <div className="flex flex-1 items-center justify-center px-8 pb-8">
            <div className="w-full max-w-md">
              <h1 className="text-3xl font-semibold text-foreground mb-2">
                {t.auth.createAccount}
              </h1>
              <p className="text-muted-foreground mb-8">
                {t.auth.signupSubtitle}
              </p>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="mt-1 flex gap-3">
                  <div className="flex-1">
                    <Label htmlFor="firstName">{t.auth.firstName}</Label>
                    <Input
                      id="firstName"
                      placeholder={t.auth.firstNamePlaceholder}
                      className="mt-1 h-[3.2rem]"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="lastName">{t.auth.lastName}</Label>
                    <Input
                      id="lastName"
                      placeholder={t.auth.lastNamePlaceholder}
                      className="mt-1 h-[3.2rem]"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">{t.auth.emailAddress}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="mt-1 h-[3.2rem]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">{t.auth.phoneNumber}</Label>
                  <div className="phone-input-container mt-1 flex items-center rounded-md border border-input bg-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <CountrySelector
                      value={selectedCountry}
                      onChange={setSelectedCountry}
                      className="max-w-fit px-3 h-[3.2rem] border-0 bg-transparent hover:bg-transparent rounded-r-none"
                    />
                    <div className="h-6 w-px bg-slate-200 dark:bg-border" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder={t.auth.phonePlaceholder}
                      className="flex-1 h-[3.2rem] border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password">{t.auth.password}</Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t.auth.createPasswordPlaceholder}
                      className="pr-10 h-[3.2rem]"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500 dark:text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500 dark:text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="!mt-8 w-full h-14"
                  disabled={isLoading}
                >
                  {isLoading ? t.auth.signingUp : t.auth.signup}
                </Button>
              </form>

              <p className="text-center text-muted-foreground mt-8">
                {t.auth.alreadyHaveAccount}{" "}
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
                  ? "url('/lovable-uploads/cover_2.png')"
                  : "none",
              }}
            />

            {/* Hidden image for loading detection */}
            <img
              src="/lovable-uploads/cover_2.png"
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
                  <p className="text-sm">Way</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
