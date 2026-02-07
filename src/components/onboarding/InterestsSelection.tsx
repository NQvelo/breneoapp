import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
const INTERESTS = [
  {
    id: 1,
    name: "Marketing",
    icon: "📣",
  },
  {
    id: 2,
    name: "Tech",
    icon: "💻",
  },
  {
    id: 3,
    name: "Design",
    icon: "🎨",
  },
  {
    id: 4,
    name: "Business",
    icon: "💼",
  },
  {
    id: 5,
    name: "Education",
    icon: "📚",
  },
  {
    id: 6,
    name: "Science",
    icon: "🔬",
  },
  {
    id: 7,
    name: "Healthcare",
    icon: "⚕️",
  },
  {
    id: 8,
    name: "Finance",
    icon: "💰",
  },
  {
    id: 9,
    name: "Arts",
    icon: "🎭",
  },
];
export function InterestsSelection() {
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const toggleInterest = (id: number) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((item) => item !== id));
    } else {
      setSelected([...selected, id]);
    }
  };
  const handleContinue = async () => {
    if (selected.length === 0) {
      toast.error("Please select at least one area of interest");
      return;
    }

    if (!user) {
      toast.error("Please sign in to save your interests.");
      return;
    }

    setLoading(true);

    try {
      // Convert selected IDs to interest names
      const selectedInterests = selected
        .map((id) => INTERESTS.find((interest) => interest.id === id)?.name)
        .filter(Boolean) as string[];

      // Update user profile with interests and mark onboarding as completed
      const { error } = await supabase
        .from("profiles")
        .update({
          interests: selectedInterests,
          onboarding_completed: true,
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      toast.success("Interests saved! Your personalized experience is ready.");

      navigate("/home");
    } catch (error: any) {
      toast.error(`Failed to save interests: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-breneo-navy mb-2">
          What are you interested in?
        </h1>
        <p className="text-gray-600">
          Select areas you'd like to explore. This helps us personalize your
          experience.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {INTERESTS.map((interest) => (
          <Card
            key={interest.id}
            className={`p-4 cursor-pointer transition-all border-2 hover:shadow-soft ${selected.includes(interest.id) ? "border-breneo-blue bg-breneo-blue/5" : "border-transparent hover:border-gray-200"}`}
            onClick={() => toggleInterest(interest.id)}
          >
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{interest.icon}</div>
              <div className="font-medium">{interest.name}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          onClick={handleContinue}
          className="bg-breneo-blue hover:bg-breneo-blue/90"
          disabled={loading}
        >
          {loading ? "Saving..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
