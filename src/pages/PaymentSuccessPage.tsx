import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { bogService } from "@/api";

const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 10;

export default function PaymentSuccessPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Confirming your payment...");
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const confirmPayment = async () => {
      try {
        await refreshUser();

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          if (cancelled) return;

          const subscription = await bogService.fetchSubscription();
          if (subscription?.is_active) {
            localStorage.removeItem("bog_order_id");
            localStorage.removeItem("selected_plan_id");
            setStatus("success");
            setMessage("Your subscription is now active. Welcome to Premium!");
            return;
          }

          if (attempt < MAX_ATTEMPTS - 1) {
            await new Promise<void>((resolve) => {
              timeoutId = setTimeout(resolve, POLL_INTERVAL_MS);
            });
          }
        }

        if (!cancelled) {
          setStatus("error");
          setMessage(
            "Payment was received, but your plan is not active yet. Please wait a moment and refresh, or contact support if this continues."
          );
        }
      } catch (error) {
        console.error("Failed to confirm payment:", error);
        if (!cancelled) {
          setStatus("error");
          setMessage(
            "We couldn't confirm your subscription. Please try again or contact support."
          );
        }
      }
    };

    confirmPayment();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
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
          {status === "loading" && "Confirming Payment"}
          {status === "success" && "Payment Successful!"}
          {status === "error" && "Activation Pending"}
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
