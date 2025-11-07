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
import { Check } from "lucide-react";

export default function SubscriptionPage() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      features: [
        "Access to basic courses",
        "Limited skill tests",
        "Basic profile features",
        "Community support",
      ],
      popular: false,
    },
    {
      name: "Pro",
      price: "$9.99",
      period: "per month",
      features: [
        "All free features",
        "Unlimited courses",
        "Unlimited skill tests",
        "Advanced profile features",
        "Priority support",
        "Certificates",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact us",
      features: [
        "All Pro features",
        "Custom integrations",
        "Dedicated support",
        "Team management",
        "Analytics dashboard",
        "Custom branding",
      ],
      popular: false,
    },
  ];

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
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period !== "forever" && plan.period !== "contact us" && (
                    <span className="text-muted-foreground">/{plan.period}</span>
                  )}
                  {plan.period === "contact us" && (
                    <span className="text-muted-foreground block text-sm mt-1">
                      {plan.period}
                    </span>
                  )}
                </div>
                <CardDescription className="mt-4">
                  {plan.name === "Free" && "Perfect for getting started"}
                  {plan.name === "Pro" && "Best for serious learners"}
                  {plan.name === "Enterprise" && "For teams and organizations"}
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
                >
                  {plan.name === "Enterprise" ? "Contact Sales" : "Get Started"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

