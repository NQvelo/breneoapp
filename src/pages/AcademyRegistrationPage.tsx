import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ImageIcon } from "lucide-react";
import { CountrySelector } from "@/components/ui/CountrySelector";
import { Country, countries } from "@/data/countries";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const AcademyRegistrationPage = () => {
  const navigate = useNavigate();

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
    countries.find((c) => c.code === "GE")
  );

  // Image loading states
  const [logoLoaded, setLogoLoaded] = useState(false);
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
          preloadImage("lovable-uploads/breneo_logo.png"),
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
      toast.error("Please fill out all fields to continue.");
      return;
    }
    setStep(2);
  };

  // Handler for the final form submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    // Final validation check
    if (step !== 2 || !description || !website) {
      toast.error("Please complete all fields to register.");
      return;
    }

    setIsLoading(true);
    const phoneNumber = `${selectedCountry?.dial_code}${phone}`;
    try {
      const response = await fetch(
        "https://breneo.onrender.com/api/academy/register/",
        {
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
        }
      );

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (response.ok) {
          toast.success("Registration successful! Please login.");
          navigate("/auth/login");
        } else {
          const errorMessages = Object.values(data).flat();
          toast.error(errorMessages.join(" ") || "Registration failed.");
        }
      } else {
        const errorText = await response.text();
        console.error("Server returned non-JSON response:", errorText);
        toast.error("A server error occurred. Please try again later.");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("An unexpected error occurred. Please try again.");
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
            <div className="h-7 w-20 bg-gray-200 animate-pulse rounded flex items-center justify-center">
              <ImageIcon className="h-3 w-3 text-gray-400" />
            </div>
          )}
          <img
            src="/lovable-uploads/breneo_logo.png"
            alt="Breneo Logo"
            className={`h-7 transition-opacity duration-300 ${
              logoLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setLogoLoaded(true)}
            onError={() => {
              setImageError(true);
              setLogoLoaded(true);
            }}
          />
          {imageError && (
            <div className="h-7 w-20 bg-gray-100 border border-gray-300 rounded flex items-center justify-center">
              <span className="text-xs text-gray-500">Breneo</span>
            </div>
          )}
        </div>
        <ThemeToggle />
      </div>

      {/* Content Section */}
      <div className="flex flex-1">
        {/* Left Section (Form) */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="mb-4 hidden lg:flex items-center justify-between">
              <div className="flex items-center">
                {!logoLoaded && !imageError && (
                  <div className="h-10 w-32 bg-gray-200 animate-pulse rounded flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-gray-400" />
                  </div>
                )}
                <img
                  src="/lovable-uploads/breneo_logo.png"
                  alt="Breneo Logo"
                  className={`h-10 transition-opacity duration-300 ${
                    logoLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={() => setLogoLoaded(true)}
                  onError={() => {
                    setImageError(true);
                    setLogoLoaded(true);
                  }}
                />
                {imageError && (
                  <div className="h-10 w-32 bg-gray-100 border border-gray-300 rounded flex items-center justify-center">
                    <span className="text-sm text-gray-500">Breneo</span>
                  </div>
                )}
              </div>
              <ThemeToggle />
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
              <div
                className="bg-[#00BFFF] h-2 rounded-full transition-all duration-500 ease-in-out"
                style={{ width: step === 1 ? "50%" : "100%" }}
              ></div>
            </div>

            <h1 className="text-3xl font-semibold text-foreground mb-2">
              Register Academy
            </h1>
            <p className="text-muted-foreground mb-8">
              {step === 1
                ? "Start by creating your account credentials."
                : "Tell us more about your academy."}
            </p>

            {/* Registration Form */}
            <form onSubmit={handleRegister} className="space-y-6">
              {/* Step 1 Fields */}
              {step === 1 && (
                <>
                  <div>
                    <Label htmlFor="name">Academy Name</Label>
                    <Input
                      id="name"
                      placeholder="Your academy's name"
                      className="mt-1 h-12"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter contact email"
                      className="mt-1 h-12"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="phone-input-container mt-1 flex items-center rounded-md border border-input transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                      <CountrySelector
                        value={selectedCountry}
                        onChange={setSelectedCountry}
                        className="w-auto h-12 border-0 bg-transparent hover:bg-transparent rounded-r-none"
                      />
                      <div className="h-6 w-px bg-slate-200" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Phone number"
                        className="flex-1 h-12 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative mt-1">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        className="pr-10 h-12"
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
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
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
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      placeholder="Describe your academy"
                      className="mt-1 w-full h-24 px-3 py-2 border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://your-academy.com"
                      className="mt-1 h-12"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {/* Navigation Buttons */}
              <div className="pt-2">
                {step === 1 && (
                  <Button
                    type="button" // Use type="button" to prevent form submission
                    onClick={handleNextStep}
                    className="w-full h-14 bg-[#00BFFF] text-white hover:bg-[#00BFFF]/90"
                  >
                    Next
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
                      Back
                    </Button>
                    <Button
                      type="submit" // Use type="submit" for final submission
                      className="w-full h-14 bg-[#00BFFF] text-white hover:bg-[#00BFFF]/90"
                      disabled={isLoading}
                    >
                      {isLoading ? "Registering..." : "Register"}
                    </Button>
                  </div>
                )}
              </div>
            </form>

            <p className="text-center text-muted-foreground mt-8">
              Already have an account?{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => navigate("/auth/login")}
              >
                Sign In
              </button>
            </p>
          </div>
        </div>

        {/* Right Section (Image) */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-5">
          <div className="relative w-full h-full rounded-xl overflow-hidden">
            {/* Loading skeleton */}
            {!backgroundLoaded && !imageError && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse flex items-center justify-center">
                <ImageIcon className="h-16 w-16 text-gray-400" />
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
