import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function PaymentFailurePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <XCircle className="h-16 w-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold">Payment Failed</h1>
        <p className="text-muted-foreground">
          Something went wrong with your payment. No charges were made.
        </p>
        <div className="flex flex-col gap-3 pt-4">
          <Button onClick={() => navigate("/home?upgrade=true")} className="w-full">
            Back to Subscriptions
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/help")}
            className="w-full"
          >
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
}
