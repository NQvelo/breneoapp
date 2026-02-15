import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { bogService } from "@/api";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/contexts/SubscriptionContext";

interface SubscriptionFeature {
  title: string;
  badge?: string;
  tooltip?: string; // we'll use this as the per-feature “detail text”
}

interface SubscriptionPlan {
  id: number;
  name: string;
  price: string;
  duration_days: number;
  description: SubscriptionFeature[];
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<number | null>(null);
  const { subscriptionInfo } = useSubscription();

  useEffect(() => {
    if (!isOpen) return;

    const loadPlans = async () => {
      try {
        setIsLoading(true);
        const data = await bogService.fetchPlans();

        const formattedData = data.map((plan: any) => {
          let desc = plan.description;

          if (typeof desc === "string" && desc.trim() !== "") {
            try {
              desc = JSON.parse(desc);
            } catch (e) {
              // Fallback if it's not JSON
              desc = desc
                .split(",")
                .map((s: string) => ({ title: s.trim() }))
                .filter((f: any) => f.title !== "");
            }
          } else {
            desc = [];
          }

          return { ...plan, description: desc };
        });

        console.log("Loaded Subscription Plans:", formattedData);
        setPlans(formattedData);
      } catch (error) {
        console.error("Failed to fetch plans:", error);
        toast.error("Failed to load subscription plans.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPlans();
  }, [isOpen]);

  const handleSubscribe = async (planId: number) => {
    setIsProcessing(true);
    setLoadingPlanId(planId);
    try {
      const response = await bogService.createOrder(planId);
      const { redirect_url, order_id } = response;

      if (redirect_url && order_id) {
        localStorage.setItem("bog_order_id", order_id);
        localStorage.setItem("selected_plan_id", planId.toString());
        
        // Register intent to save card BEFORE redirecting to payment
        // This is required by BOG for recurring payments
        try {
          await bogService.saveCard(order_id, planId);
        } catch (e) {
          console.warn("Card registration intent failed, but continuing to payment:", e);
        }
        
        window.location.href = redirect_url;
      } else {
        throw new Error("Invalid response from payment server");
      }
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error("Failed to initiate checkout. Please try again.");
      setIsProcessing(false);
      setLoadingPlanId(null);
    }
  };

  const getPriceDetails = (plan: SubscriptionPlan) => {
    const price = parseFloat(plan.price);
    let originalPrice = price * 2.5;

    let savePercentage = 60;
    let period = "month";

    if (plan.name.toLowerCase().includes("weekly")) {
      period = "week";
      originalPrice = price * 4;
      savePercentage = 75;
    } else if (plan.name.toLowerCase().includes("quarterly")) {
      period = "3 months";
      originalPrice = price * 3;
      savePercentage = 67;
    }

    return {
      price: price.toFixed(2),
      originalPrice: originalPrice.toFixed(2),
      savePercentage,
      period,
    };
  };

  const displayPlans = plans.slice(0, 3);

  const PlanCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 max-w-5xl mx-auto">
      {displayPlans.map((plan) => {
        const details = getPriceDetails(plan);
        const hasFire = plan.name.toLowerCase().includes("quarterly");
        const isPlusPlan = plan.name.toLowerCase().includes("plus");
        const planFeatures = Array.isArray(plan.description)
          ? plan.description
          : [];

        return (
          <div key={plan.id} className="flex flex-col gap-3">
            <Card
              className={`rounded-2xl border relative overflow-hidden flex flex-col bg-white dark:bg-[#242424] ${
                isPlusPlan
                  ? "border-breneo-blue dark:border-breneo-blue"
                  : "border-gray-100 dark:border-gray-800"
              }`}
            >
              <div className="px-4 pt-4 pb-3 flex items-center gap-1 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 leading-tight">
                  {plan.name} Plan
                </h3>
                {hasFire && <span className="text-base">🔥</span>}
                {subscriptionInfo?.is_active &&
                  subscriptionInfo.plan_name === plan.name && (
                    <Badge className="ml-2 bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                      Current Plan
                    </Badge>
                  )}
              </div>

              <div className="px-4 pt-3 pb-4">
                <div className="text-gray-400 dark:text-gray-500 line-through text-sm font-medium">
                  ₾{details.originalPrice}/{details.period}
                </div>
                <div className="flex items-center flex-wrap gap-2 mt-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                      ₾{details.price}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 font-bold text-sm">
                      /{details.period}
                    </span>
                  </div>
                  <div className="bg-gradient-to-r from-[#01bfff] to-[#0088cc] text-white rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-tight">
                    Save {details.savePercentage}%
                  </div>
                </div>
              </div>

              <div className="flex-grow" />

              <Button
                onClick={() => handleSubscribe(plan.id)}
                disabled={
                  isProcessing ||
                  (subscriptionInfo?.is_active &&
                    subscriptionInfo.plan_name === plan.name)
                }
                variant={
                  subscriptionInfo?.is_active &&
                  subscriptionInfo.plan_name === plan.name
                    ? "secondary"
                    : "default"
                }
                className="w-full rounded-none rounded-b-2xl"
              >
                {isProcessing && loadingPlanId === plan.id ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : subscriptionInfo?.is_active &&
                  subscriptionInfo.plan_name === plan.name ? (
                  "Current Plan"
                ) : (
                  "Upgrade Now"
                )}
              </Button>
            </Card>

            <div
              className={`rounded-xl border overflow-hidden bg-white dark:bg-[#242424] ${
                isPlusPlan
                  ? "border-breneo-blue dark:border-breneo-blue"
                  : "border-gray-100 dark:border-gray-800"
              }`}
            >
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {planFeatures.map((feature, idx) => (
                  <div
                    key={`${plan.id}-${feature.title}-${idx}`}
                    className="px-3 py-2.5 flex items-center justify-between min-h-[44px]"
                  >
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 pr-3">
                      {feature.title}
                    </span>
                    {feature.badge && (
                      <Badge className="bg-breneo-blue text-white hover:bg-breneo-blue font-bold text-[10px] px-2 border-0">
                        {feature.badge}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="bg-white/95 dark:bg-black/70 backdrop-blur-md z-[100] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-300" />
        <DialogContent
          className="fixed inset-0 z-[101] w-full h-full max-w-none rounded-none border-none p-0 overflow-y-auto bg-[#F2F2F3] dark:bg-[#181818] shadow-none outline-none transform-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0 data-[state=closed]:slide-out-to-left-0 data-[state=closed]:slide-out-to-top-0 duration-300"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="w-full min-h-full pt-20 pb-20 px-4 sm:px-12 md:px-20 lg:px-32">
            <div className="text-center mb-16 px-4">
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-gray-100 mb-4 tracking-tight">
                Get 3x More Interviews{" "}
                <span className="text-gray-500 dark:text-gray-400 font-bold">
                  For Less than ₾1 a day
                </span>
              </h1>
              <p className="text-lg md:text-xl font-bold text-gray-500 dark:text-gray-400">
                Interview-winning tools + live career coaching—all in{" "}
                <span className="text-breneo-blue">Breneo Pro</span>
              </p>
            </div>

            {isLoading ? (
              <div className="max-w-6xl mx-auto space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Skeleton className="h-[400px] rounded-[32px]" />
                  <Skeleton className="h-[400px] rounded-[32px]" />
                  <Skeleton className="h-[400px] rounded-[32px]" />
                </div>
                <Skeleton className="h-[500px] rounded-[32px]" />
              </div>
            ) : (
              <div className="max-w-7xl mx-auto">
                <PlanCards />

                {/* Testimonial Section */}
                <div className="mt-16 mb-12 max-w-6xl mx-auto bg-white dark:bg-[#242424] border border-gray-100 dark:border-gray-800 rounded-[24px] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                  <p className="text-gray-800 dark:text-gray-100 text-xl font-bold italic text-center md:text-left leading-relaxed">
                    "Breneo Plus took me from 'just browsing' to signed offer in
                    21 days—total game changer."
                  </p>
                  <div className="flex items-center gap-4 bg-gray-50 dark:bg-[#242424] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shrink-0">
                    <img
                      src="/lovable-uploads/randomstudent.png"
                      alt="Rahul S."
                      className="h-12 w-12 rounded-full border-2 border-white dark:border-gray-800 object-cover"
                    />
                    <div>
                      <div className="text-lg font-black text-gray-900 dark:text-gray-100">
                        Rahul S.
                      </div>
                      <div className="text-sm font-bold text-breneo-blue">
                        Software Engineer
                      </div>
                    </div>
                  </div>
                </div>
                <div className="h-12" />
              </div>
            )}
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
