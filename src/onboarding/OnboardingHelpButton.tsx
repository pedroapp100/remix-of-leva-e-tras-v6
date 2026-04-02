import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOnboarding } from "./OnboardingContext";

/**
 * Floating help button that allows users to restart the onboarding tour
 * for the current page. Shows in the header area.
 */
export function OnboardingHelpButton() {
  const { startTour, isActive, hasSeenCurrentTour } = useOnboarding();

  // Don't show if tour is currently active
  if (isActive) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:h-9 md:w-9 rounded-lg hover:bg-muted/60 hover:text-foreground transition-all duration-200 relative"
          onClick={() => startTour()}
          aria-label="Iniciar tour guiado"
        >
          <HelpCircle className="h-4 w-4" />
          {!hasSeenCurrentTour && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Tour guiado</p>
      </TooltipContent>
    </Tooltip>
  );
}
