import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BreneoLogo } from "@/components/common/BreneoLogo";
import { FileUp, ClipboardCheck, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/contexts/LanguageContext";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const t = useTranslation();

  const handleUploadCV = () => {
    navigate("/profile");
    onClose();
  };

  const handleStartAssessment = () => {
    navigate("/skill-test");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-3xl border-none">
        <div className="bg-white dark:bg-card p-8 flex flex-col items-center text-center">
          <BreneoLogo className="h-10 mb-8" />
          
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Welcome to Breneo!
          </h2>
          
          <p className="text-muted-foreground mb-8 leading-relaxed">
            To give you the best experience and match you with the right opportunities, 
            it's important to understand your skills and background. Choose how you'd like to start.
          </p>

          <div className="grid grid-cols-1 gap-4 w-full mb-8">
            <button
              onClick={handleUploadCV}
              className="flex items-center gap-4 p-5 rounded-2xl border-2 border-transparent bg-gray-50 dark:bg-secondary/50 hover:bg-primary/5 hover:border-primary/20 transition-all text-left"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FileUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Upload CV</div>
                <div className="text-sm text-muted-foreground">Automatically extract your skills and experience</div>
              </div>
            </button>

            <button
              onClick={handleStartAssessment}
              className="flex items-center gap-4 p-5 rounded-2xl border-2 border-transparent bg-gray-50 dark:bg-secondary/50 hover:bg-primary/5 hover:border-primary/20 transition-all text-left"
            >
              <div className="h-12 w-12 rounded-xl bg-[#00BFFF]/10 flex items-center justify-center shrink-0">
                <ClipboardCheck className="h-6 w-6 text-[#00BFFF]" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Start Assessment</div>
                <div className="text-sm text-muted-foreground">Don't have a CV? Test your skills and discover professions</div>
              </div>
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Skip now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
