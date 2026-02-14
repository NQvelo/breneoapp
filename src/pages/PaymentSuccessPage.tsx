import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle, Sparkles } from "lucide-react";
import { bogService } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import confetti from "canvas-confetti";

export default function PaymentSuccessPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Activating your premium subscription...");
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const fireConfetti = () => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  useEffect(() => {
    const finalizePayment = async () => {
      const orderId = localStorage.getItem("bog_order_id");
      const savedPlanId = localStorage.getItem("selected_plan_id");
      
      // Fallback to URL query parameter if localStorage is missing
      const urlParams = new URLSearchParams(window.location.search);
      const urlPlanId = urlParams.get("plan_id");
      
      const finalPlanId = savedPlanId || urlPlanId;
      const planId = finalPlanId ? parseInt(finalPlanId, 10) : undefined;

      try {
        // We no longer call bogService.saveCard(orderId, planId) here
        // because it must happen BEFORE the payment redirect.
        
        // Clear order ID and plan ID after successful flow
        localStorage.removeItem("bog_order_id");
        localStorage.removeItem("selected_plan_id");
        // Update user state to premium
        await refreshUser();
        setStatus("success");
        setMessage("Your monthly subscription is now active. Welcome to Premium!");
        fireConfetti();
      } catch (error) {
        console.error("Failed to save card:", error);
        setStatus("error");
        setMessage("We couldn't activate your subscription. Please try again or contact support.");
      }
    };

    finalizePayment();
  }, [refreshUser]);

  return (
    <DashboardLayout showSidebar={false}>
      <div className="flex items-center justify-center min-h-[70vh] bg-background">
        <Card className="w-full max-w-md mx-auto border-gray-100 dark:border-gray-800 shadow-xl rounded-3xl relative overflow-hidden">
          {status === "success" && (
            <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse" />
          )}
          
          <CardHeader className="text-center pt-10 pb-6">
            <div className="flex justify-center mb-6">
              {status === "loading" && (
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
              )}
              {status === "success" && (
                <div className="bg-green-500/10 p-4 rounded-full border border-green-500/20">
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                </div>
              )}
              {status === "error" && (
                <div className="bg-red-500/10 p-4 rounded-full border border-red-500/20">
                  <XCircle className="h-16 w-16 text-destructive" />
                </div>
              )}
            </div>
            
            <CardTitle className="text-2xl font-bold mb-2">
              {status === "loading" && "Processing Payment"}
              {status === "success" && "Payment Successful!"}
              {status === "error" && "Payment Error"}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-lg italic">
              {message}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex flex-col gap-4 pb-10 px-8">
            {status !== "loading" && (
              <Button 
                onClick={() => navigate("/dashboard")} 
                className="w-full h-11 font-bold rounded-2xl"
              >
                Go to Dashboard
              </Button>
            )}
            {status === "error" && (
              <Button 
                variant="outline" 
                onClick={() => navigate("/home?upgrade=true")} 
                className="w-full h-11 rounded-2xl"
              >
                Try Again
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
