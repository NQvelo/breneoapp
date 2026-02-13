import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { bogService } from "@/api";
import { toast } from "sonner";

export default function SubscriptionPage() {
  const plans = [
    {
      name: "Test",
      price: "0.1",
      currency: "₾",
      amount: 0.1,
      period: "per month",
      features: [
        "Test payment integration",
        "Access to basic courses",
        "Limited skill tests",
        "Basic profile features",
      ],
      popular: false,
    },
    {
      name: "Basic",
      price: "5",
      currency: "₾",
      amount: 5,
      period: "per month",
      features: [
        "Access to all courses",
        "Unlimited skill tests",
        "Advanced profile features",
        "Priority support",
        "Certificates",
      ],
      popular: false,
    },
    {
      name: "Premium",
      price: "10",
      currency: "₾",
      amount: 10,
      period: "per month",
      features: [
        "All Basic features",
        "AI-powered recommendations",
        "1-on-1 mentorship sessions",
        "Exclusive webinars",
        "Job placement assistance",
        "Lifetime access to materials",
      ],
      popular: true,
    },
  ];

  const [isLoading, setIsLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (amount: number, planName: string) => {
    setIsLoading(true);
    setLoadingPlan(planName);
    try {
      const response = await bogService.createOrder(amount);
      const { redirect_url, order_id } = response;

      if (redirect_url && order_id) {
        // Store order_id for handling the return
        localStorage.setItem("bog_order_id", order_id);
        // Redirect to BOG
        window.location.href = redirect_url;
      } else {
        throw new Error("Invalid response from payment server");
      }
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error("Failed to initiate checkout. Please try again.");
      setIsLoading(false);
      setLoadingPlan(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-8 lg:px-12 xl:px-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">
            Select the plan that best fits your learning journey
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mt-12">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular
                  ? "border-primary shadow-lg scale-105"
                  : "border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    {plan.currency}{plan.price}
                  </span>
                  <span className="text-muted-foreground">
                    /{plan.period}
                  </span>
                </div>
                <CardDescription className="mt-4">
                  {plan.name === "Test" && "Perfect for testing payments"}
                  {plan.name === "Basic" && "Best for serious learners"}
                  {plan.name === "Premium" && "Complete learning experience"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleSubscribe(plan.amount, plan.name)}
                  disabled={isLoading && loadingPlan === plan.name}
                >
                  {isLoading && loadingPlan === plan.name ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Subscribe Now"
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
