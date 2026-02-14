import React from "react";
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
import { XCircle } from "lucide-react";

export default function PaymentFailurePage() {
  const navigate = useNavigate();

  return (
    <DashboardLayout showSidebar={false}>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md mx-auto border-0 shadow-xl bg-white/80 dark:bg-card/80 backdrop-blur-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">Payment Failed</CardTitle>
            <CardDescription className="mt-2 text-lg">
              Something went wrong with your payment. No charges were made.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 mt-4">
            <Button 
              onClick={() => navigate("/home?upgrade=true")} 
              className="w-full"
            >
              Back to Subscriptions
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/help")} 
              className="w-full"
            >
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
