import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ImageIcon } from "lucide-react";
import { CountrySelector } from "@/components/ui/CountrySelector";
import { Country, countries } from "@/data/countries";
import { toast } from "sonner";
import { AuthPageHeader } from "@/components/auth/AuthPageHeader";
import { AuthLegalNotice } from "@/components/auth/AuthLegalNotice";
import { API_BASE_URL } from "@/api/auth/config";
import { useTranslation } from "@/contexts/LanguageContext";

const AcademyRegistrationPage = () => {
  const navigate = useNavigate();
  const t = useTranslation();

  // State for form steps
  const [step, setStep] = useState(1);

  // States for all form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");

  // UI/Helper states
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(
    countries.find((c) => c.code === "GE"),
  );

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
          preloadImage("/lovable-uploads/academy.png"),
        ]);
      } catch (error) {
        console.warn("Some images failed to preload:", error);
        setImageError(true);
      }
    };

    preloadImages();
  }, [preloadImage]);

  // Handler to move to the next step
  const handleNextStep = () => {
    // Basic validation for the first step
    if (!name || !email || !password || !phone) {
      toast.error(t.academyRegistration.fillStep1);
      return;
    }
    setStep(2);
  };

  // Handler for the final form submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    // Final validation check
    if (step !== 2 || !description || !website) {
      toast.error(t.academyRegistration.fillStep2);
      return;
    }

    setIsLoading(true);
    const phoneNumber = `${selectedCountry?.dial_code}${phone}`;
    try {
      const response = await fetch(`${API_BASE_URL}/api/academy/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          phone_number: phoneNumber,
          description,
          website,
        }),
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (response.ok) {
          toast.success(t.academyRegistration.success);
          // Store email for verification page
          sessionStorage.setItem("tempAcademyEmail", email);
          navigate("/email-verification", {
            state: { email, isAcademy: true },
          });
        } else {
          const errorMessages = Object.values(data).flat();
          toast.error(errorMessages.join(" ") || t.academyRegistration.failed);
        }
      } else {
        const errorText = await response.text();
        console.error("Server returned non-JSON response:", errorText);
        toast.error(t.academyRegistration.serverError);
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(t.academyRegistration.unexpectedError);
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
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-secondary rounded-full h-2 mb-8">
                <div
                  className="bg-[#00BFFF] h-2 rounded-full transition-all duration-500 ease-in-out"
                  style={{ width: step === 1 ? "50%" : "100%" }}
                ></div>
              </div>

              <h1 className="text-3xl font-semibold text-foreground mb-2">
                {t.academyRegistration.title}
              </h1>
              <p className="text-muted-foreground mb-8">
                {step === 1
                  ? t.academyRegistration.step1Subtitle
                  : t.academyRegistration.step2Subtitle}
              </p>

              {/* Registration Form */}
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Step 1 Fields */}
                {step === 1 && (
                  <>
                    <div>
                      <Label htmlFor="name">
                        {t.academyRegistration.academyName}
                      </Label>
                      <Input
                        id="name"
                        placeholder={
                          t.academyRegistration.academyNamePlaceholder
                        }
                        className="mt-1 h-[3.2rem]"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">{t.auth.emailAddress}</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t.academyRegistration.emailPlaceholder}
                        className="mt-1 h-[3.2rem]"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">{t.auth.phoneNumber}</Label>
                      <div className="phone-input-container mt-1 flex items-center rounded-md border border-input bg-input transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
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
                  </>
                )}

                {/* Step 2 Fields */}
                {step === 2 && (
                  <>
                    <div>
                      <Label htmlFor="description">
                        {t.academyRegistration.description}
                      </Label>
                      <textarea
                        id="description"
                        placeholder={
                          t.academyRegistration.descriptionPlaceholder
                        }
                        className="mt-1 w-full h-24 px-3 py-2 text-base border border-input bg-input text-foreground placeholder:text-muted-foreground rounded-md resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="website">
                        {t.academyRegistration.website}
                      </Label>
                      <Input
                        id="website"
                        type="url"
                        placeholder="https://your-academy.com"
                        className="mt-1 h-[3.2rem]"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                {/* Navigation Buttons */}
                <div className="!mt-8">
                  {step === 1 && (
                    <Button
                      type="button" // Use type="button" to prevent form submission
                      onClick={handleNextStep}
                      className="w-full h-14"
                    >
                      {t.academyRegistration.next}
                    </Button>
                  )}

                  {step === 2 && (
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-14"
                        onClick={() => setStep(1)}
                      >
                        {t.academyRegistration.back}
                      </Button>
                      <Button
                        type="submit" // Use type="submit" for final submission
                        className="w-full h-14"
                        disabled={isLoading}
                      >
                        {isLoading
                          ? t.academyRegistration.registering
                          : t.academyRegistration.register}
                      </Button>
                    </div>
                  )}
                </div>
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

        {/* Right Section (Image) */}
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
                  ? "url('/lovable-uploads/academy.png')"
                  : "none",
              }}
            />

            {/* Hidden image for loading detection */}
            <img
              src="/lovable-uploads/academy.png"
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
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src="/lovable-uploads/academy.png"
                  alt="Academy"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademyRegistrationPage;
