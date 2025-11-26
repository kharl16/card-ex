import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

export interface WizardStep {
  id: string;
  title: string;
  shortTitle?: string;
  description?: string;
  isPremium?: boolean;
  content: React.ReactNode;
  icon?: React.ReactNode;
}

interface EditorWizardProps {
  steps: WizardStep[];
  onComplete?: () => void;
}

export function EditorWizard({ steps, onComplete }: EditorWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const goNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      // Scroll to top of section
      document.querySelector('.wizard-content')?.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onComplete?.();
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      document.querySelector('.wizard-content')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToStep = (index: number) => {
    setCurrentStep(index);
    document.querySelector('.wizard-content')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="flex flex-col h-full">
      {/* Step Indicator */}
      <div className="mb-4 overflow-x-auto pb-2">
        <div className="flex items-center gap-1 min-w-max px-1">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isUpcoming = index > currentStep;

            return (
              <button
                key={step.id}
                onClick={() => goToStep(index)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all",
                  "hover:bg-muted/60",
                  isCurrent && "bg-[#D4AF37]/10 text-[#D4AF37] font-medium",
                  isCompleted && "text-[#D4AF37]",
                  isUpcoming && "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium",
                    isCurrent && "bg-[#D4AF37] text-[#0B0B0C]",
                    isCompleted && "bg-[#D4AF37]/20 text-[#D4AF37]",
                    isUpcoming && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <span className="hidden sm:inline whitespace-nowrap">
                  {step.shortTitle || step.title}
                </span>
                {step.isPremium && (
                  <Badge
                    variant="outline"
                    className="text-[8px] uppercase tracking-wide px-1 py-0 bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/40 hidden md:inline-flex"
                  >
                    Pro
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Step Header */}
      <div className="mb-4 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">
            {currentStepData.title}
          </h3>
          {currentStepData.isPremium && (
            <Badge
              variant="outline"
              className="text-[10px] uppercase tracking-wide px-2 py-0.5 bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/40"
            >
              Premium
            </Badge>
          )}
        </div>
        {currentStepData.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {currentStepData.description}
          </p>
        )}
      </div>

      {/* Step Content */}
      <div className="wizard-content flex-1 overflow-y-auto min-h-0">
        {currentStepData.content}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        <span className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {steps.length}
        </span>

        <Button
          onClick={goNext}
          className="gap-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#0B0B0C]"
        >
          {currentStep === steps.length - 1 ? "Finish" : "Next"}
          {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
