import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { findTourForPage, ALL_TOURS, type OnboardingTour, type OnboardingStep } from "./onboardingSteps";
import { useLocation } from "react-router-dom";

// ─── Storage keys ────────────────────────────────────────────────────────────
const STORAGE_KEY = "leva-traz-onboarding";

interface CompletionState {
  /** Tour IDs that have been completed */
  completed: string[];
  /** Tour IDs that the user dismissed (skip all) */
  dismissed: string[];
}

function loadCompletionState(): CompletionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore parse errors
  }
  return { completed: [], dismissed: [] };
}

function saveCompletionState(state: CompletionState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ─── Context ─────────────────────────────────────────────────────────────────
interface OnboardingContextType {
  /** Whether a tour is currently active */
  isActive: boolean;
  /** Current tour being displayed */
  currentTour: OnboardingTour | null;
  /** Current step index (0-based) */
  currentStepIndex: number;
  /** Current step data */
  currentStep: OnboardingStep | null;
  /** Total steps in current tour */
  totalSteps: number;
  /** Start a specific tour by ID, or auto-detect from current page */
  startTour: (tourId?: string) => void;
  /** Advance to next step */
  nextStep: () => void;
  /** Go back to previous step */
  prevStep: () => void;
  /** Skip/dismiss the current tour */
  skipTour: () => void;
  /** Complete the current tour */
  completeTour: () => void;
  /** Whether a tour has been seen for the current page */
  hasSeenCurrentTour: boolean;
  /** Reset all onboarding progress */
  resetAll: () => void;
  /** Current role for auto-detection */
  role: string | null;
  /** Set role for tour matching */
  setRole: (role: string | null) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [completion, setCompletion] = useState<CompletionState>(loadCompletionState);
  const [isActive, setIsActive] = useState(false);
  const [currentTour, setCurrentTour] = useState<OnboardingTour | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [role, setRole] = useState<string | null>(null);

  // Persist completion state
  useEffect(() => {
    saveCompletionState(completion);
  }, [completion]);

  const isTourSeen = useCallback(
    (tourId: string) => completion.completed.includes(tourId) || completion.dismissed.includes(tourId),
    [completion]
  );

  const currentStep = currentTour?.steps[currentStepIndex] ?? null;
  const totalSteps = currentTour?.steps.length ?? 0;

  // Check if current page's tour has been seen
  const currentPageTour = role ? findTourForPage(role, location.pathname) : undefined;
  const hasSeenCurrentTour = currentPageTour ? isTourSeen(currentPageTour.id) : true;

  // Auto-trigger tour on page change (only if not seen)
  useEffect(() => {
    if (!role || isActive) return;

    const tour = findTourForPage(role, location.pathname);
    if (tour && !isTourSeen(tour.id)) {
      // Small delay to let the page render and DOM targets be available
      const timer = setTimeout(() => {
        setCurrentTour(tour);
        setCurrentStepIndex(0);
        setIsActive(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [role, location.pathname, isTourSeen, isActive]);

  const startTour = useCallback(
    (tourId?: string) => {
      let tour: OnboardingTour | undefined;

      if (tourId) {
        tour = ALL_TOURS.find((t: OnboardingTour) => t.id === tourId);
      } else if (role) {
        tour = findTourForPage(role, location.pathname);
      }

      if (tour) {
        setCurrentTour(tour);
        setCurrentStepIndex(0);
        setIsActive(true);
      }
    },
    [role, location.pathname]
  );

  const nextStep = useCallback(() => {
    if (!currentTour) return;
    if (currentStepIndex < currentTour.steps.length - 1) {
      setCurrentStepIndex((i) => i + 1);
    } else {
      // Last step → complete
      setCompletion((prev) => ({
        ...prev,
        completed: [...new Set([...prev.completed, currentTour.id])],
      }));
      setIsActive(false);
      setCurrentTour(null);
      setCurrentStepIndex(0);
    }
  }, [currentTour, currentStepIndex]);

  const prevStep = useCallback(() => {
    setCurrentStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const skipTour = useCallback(() => {
    if (!currentTour) return;
    setCompletion((prev) => ({
      ...prev,
      dismissed: [...new Set([...prev.dismissed, currentTour.id])],
    }));
    setIsActive(false);
    setCurrentTour(null);
    setCurrentStepIndex(0);
  }, [currentTour]);

  const completeTour = useCallback(() => {
    if (!currentTour) return;
    setCompletion((prev) => ({
      ...prev,
      completed: [...new Set([...prev.completed, currentTour.id])],
    }));
    setIsActive(false);
    setCurrentTour(null);
    setCurrentStepIndex(0);
  }, [currentTour]);

  const resetAll = useCallback(() => {
    setCompletion({ completed: [], dismissed: [] });
    setIsActive(false);
    setCurrentTour(null);
    setCurrentStepIndex(0);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentTour,
        currentStepIndex,
        currentStep,
        totalSteps,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        completeTour,
        hasSeenCurrentTour,
        resetAll,
        role,
        setRole,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
