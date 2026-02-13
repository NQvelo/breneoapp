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
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { bogService } from "@/api";
import { useAuth } from "@/contexts/AuthContext";

export default function PaymentSuccessPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Activating your premium subscription...");
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const finalizePayment = async () => {
      const orderId = localStorage.getItem("bog_order_id");

      if (!orderId) {
        setStatus("error");
        setMessage("Order ID not found. Please contact support.");
        return;
      }

      try {
        await bogService.saveCard(orderId);
        // Clear order ID after successful save
        localStorage.removeItem("bog_order_id");
        // Update user state to premium
        await refreshUser();
        setStatus("success");
        setMessage("Your monthly subscription is now active. Welcome to Premium!");
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md mx-auto border-0 shadow-xl bg-white/80 dark:bg-card/80 backdrop-blur-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {status === "loading" && (
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
              )}
              {status === "success" && (
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              )}
              {status === "error" && (
                <XCircle className="h-16 w-16 text-destructive" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold">
              {status === "loading" && "Processing Payment"}
              {status === "success" && "Payment Successful!"}
              {status === "error" && "Payment Error"}
            </CardTitle>
            <CardDescription className="mt-2 text-lg">
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 mt-4">
            {status !== "loading" && (
              <Button 
                onClick={() => navigate("/dashboard")} 
                className="w-full"
              >
                Go to Dashboard
              </Button>
            )}
            {status === "error" && (
              <Button 
                variant="outline" 
                onClick={() => navigate("/subscription")} 
                className="w-full"
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
