import { useOnboarding } from "./OnboardingContext";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Animated floating tooltip with framer-motion transitions between steps.
 */
export function OnboardingTooltip() {
  const {
    isActive,
    currentTour,
    currentStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    prevStep,
    skipTour,
  } = useOnboarding();

  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [ready, setReady] = useState(false);

  const calculatePosition = useCallback(() => {
    if (!currentStep?.target || !tooltipRef.current) return;

    const el = document.querySelector(currentStep.target);
    if (!el) return;

    const targetRect = el.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const placement = currentStep.placement || "bottom";
    const gap = 20;

    let top = 0;
    let left = 0;

    switch (placement) {
      case "bottom":
        top = targetRect.bottom + gap;
        left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        break;
      case "top":
        top = targetRect.top - tooltipRect.height - gap;
        left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        break;
      case "right":
        top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        left = targetRect.right + gap;
        break;
      case "left":
        top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        left = targetRect.left - tooltipRect.width - gap;
        break;
    }

    // Keep within viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    left = Math.max(12, Math.min(left, vw - tooltipRect.width - 12));
    top = Math.max(12, Math.min(top, vh - tooltipRect.height - 12));

    setPosition({ top, left });
    setReady(true);

    // Scroll target into view if needed
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [currentStep]);

  useEffect(() => {
    if (!isActive || !currentStep) {
      setReady(false);
      return;
    }

    // Brief delay for DOM settlement then calculate
    setReady(false);
    const timer = setTimeout(calculatePosition, 120);

    window.addEventListener("scroll", calculatePosition, true);
    window.addEventListener("resize", calculatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", calculatePosition, true);
      window.removeEventListener("resize", calculatePosition);
    };
  }, [isActive, currentStep, calculatePosition]);

  if (!isActive || !currentStep || !currentTour) return null;

  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === totalSteps - 1;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[9999] w-[320px] max-w-[calc(100vw-24px)] pointer-events-none"
      style={{ top: position.top, left: position.left }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`step-${currentStepIndex}`}
          role="dialog"
          aria-label={currentStep.title}
          className="pointer-events-auto rounded-xl border bg-popover text-popover-foreground shadow-2xl shadow-black/20"
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={ready ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.96 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 28,
            mass: 0.8,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.25 }}
            >
              <HelpCircle className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-medium text-muted-foreground">
                {currentTour.tourTitle}
              </span>
            </motion.div>
            <button
              onClick={skipTour}
              className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fechar tour"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 pb-2">
            <motion.h3
              className="text-sm font-semibold mb-1"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.25 }}
            >
              {currentStep.title}
            </motion.h3>
            <motion.p
              className="text-xs text-muted-foreground leading-relaxed"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.25 }}
            >
              {currentStep.content}
            </motion.p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 pb-3 pt-1">
            {/* Step indicator */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <motion.div
                  key={i}
                  className="h-1.5 rounded-full bg-primary"
                  initial={false}
                  animate={{
                    width: i === currentStepIndex ? 16 : 6,
                    opacity: i === currentStepIndex ? 1 : i < currentStepIndex ? 0.4 : 0.15,
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1.5">
              {!isFirst && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevStep}
                  className="h-7 px-2 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
                  Anterior
                </Button>
              )}
              <Button
                size="sm"
                onClick={nextStep}
                className="h-7 px-3 text-xs"
              >
                {isLast ? "Concluir" : "Próximo"}
                {!isLast && <ChevronRight className="h-3.5 w-3.5 ml-0.5" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
