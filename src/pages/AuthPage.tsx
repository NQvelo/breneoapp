import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { CountrySelector } from "@/components/ui/CountrySelector";
import { Country, countries } from "@/data/countries";
import { toast } from "sonner";

const AuthPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(
    countries.find((c) => c.code === "GB")
  );

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    const phoneNumber = `${selectedCountry?.dial_code}${phone}`;

    try {
      const response = await fetch(
        "https://breneo.onrender.com/api/register/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone_number: phoneNumber,
            password: password,
          }),
        }
      );

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (response.ok) {
          toast.success("Registration successful! Verify your email.");

          // Save email & password temporarily for auto-login
          sessionStorage.setItem("tempEmail", email);
          sessionStorage.setItem("tempPassword", password);

          navigate("/email-verification");
        } else {
          const errorMessages = Object.values(data).flat();
          toast.error(errorMessages.join(" ") || "Registration failed.");
        }
      } else {
        const errorText = await response.text();
        console.error("Server returned non-JSON response:", errorText);
        toast.error("Server error. Try again later.");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Unexpected error occurred. Try again.");
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
            Create Account
          </h1>
          <p className="text-gray-600 mb-8">Sign up for your Breneo account</p>

          <form onSubmit={handleRegister} className="space-y-6">
            <div className="mt-1 flex gap-3">
              <div className="flex-1">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  className="mt-1 h-12"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  className="mt-1 h-12"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

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
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <div className="phone-input-container mt-1 flex items-center rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
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

            <Button
              type="submit"
              className="w-full h-14 bg-[#00BFFF] text-white hover:bg-[#00BFFF]/90"
              disabled={isLoading}
            >
              {isLoading ? "Signing Up..." : "Sign Up"}
            </Button>
          </form>

          <p className="text-center text-gray-600 mt-8">
            Already have an account?{" "}
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

      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-5">
        <div
          className="w-full h-full bg-cover bg-center bg-no-repeat rounded-xl"
          style={{ backgroundImage: `url('/lovable-uploads/way.png')` }}
        ></div>
      </div>
    </div>
  );
};

export default AuthPage;
