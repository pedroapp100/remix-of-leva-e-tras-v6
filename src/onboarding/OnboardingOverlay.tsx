import { useOnboarding } from "./OnboardingContext";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Full-screen SVG overlay with an animated spotlight cutout.
 * Uses an SVG mask for smooth rounded-rect spotlight with framer-motion transitions.
 */
export function OnboardingOverlay() {
  const { isActive, currentStep, skipTour } = useOnboarding();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>(0);

  const updateRect = useCallback(() => {
    if (!currentStep?.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(currentStep.target);
    if (el) {
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    if (!isActive) return;

    // Use rAF for smooth initial positioning
    rafRef.current = requestAnimationFrame(updateRect);

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateRect);
    };

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [isActive, updateRect]);

  const padding = 10;
  const radius = 14;

  const spotX = rect ? rect.left - padding : 0;
  const spotY = rect ? rect.top - padding : 0;
  const spotW = rect ? rect.width + padding * 2 : 0;
  const spotH = rect ? rect.height + padding * 2 : 0;

  return (
    <AnimatePresence>
      {isActive && rect && (
        <motion.div
          className="fixed inset-0 z-[9998]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          onClick={skipTour}
          aria-hidden="true"
        >
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <mask id="onboarding-spotlight-mask">
                {/* White = visible overlay */}
                <rect width="100%" height="100%" fill="white" />
                {/* Black = cutout (transparent hole) */}
                <motion.rect
                  fill="black"
                  rx={radius}
                  ry={radius}
                  initial={{ x: spotX, y: spotY, width: spotW, height: spotH, opacity: 0 }}
                  animate={{ x: spotX, y: spotY, width: spotW, height: spotH, opacity: 1 }}
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    y: { type: "spring", stiffness: 300, damping: 30 },
                    width: { type: "spring", stiffness: 300, damping: 30 },
                    height: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                />
              </mask>
            </defs>
            {/* Overlay background with mask */}
            <rect
              width="100%"
              height="100%"
              fill="hsl(230 35% 6% / 0.6)"
              mask="url(#onboarding-spotlight-mask)"
            />
          </svg>

          {/* Spotlight glow ring */}
          <motion.div
            className="absolute pointer-events-none rounded-[14px] ring-2 ring-primary/40 shadow-[0_0_30px_rgba(99,102,241,0.15)]"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              opacity: { duration: 0.3, delay: 0.15 },
              scale: { type: "spring", stiffness: 400, damping: 25, delay: 0.1 },
            }}
            style={{
              left: spotX,
              top: spotY,
              width: spotW,
              height: spotH,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
