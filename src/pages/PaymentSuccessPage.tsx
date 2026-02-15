import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function PaymentSuccessPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Activating your premium subscription...");
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const finalizePayment = async () => {
      try {
        localStorage.removeItem("bog_order_id");
        localStorage.removeItem("selected_plan_id");
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        {status === "loading" && (
          <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto" />
        )}
        {status === "success" && (
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
        )}
        {status === "error" && (
          <XCircle className="h-16 w-16 text-destructive mx-auto" />
        )}

        <h1 className="text-2xl font-bold">
          {status === "loading" && "Processing Payment"}
          {status === "success" && "Payment Successful!"}
          {status === "error" && "Payment Error"}
        </h1>
        <p className="text-muted-foreground">{message}</p>

        {status !== "loading" && (
          <div className="flex flex-col gap-3 pt-4">
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              Go to Dashboard
            </Button>
            {status === "error" && (
              <Button
                variant="outline"
                onClick={() => navigate("/home?upgrade=true")}
                className="w-full"
              >
                Try Again
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
