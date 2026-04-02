import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Ícone de motocicleta personalizado para o Leva e Traz.
 * Substitui o caminhão em todos os pontos de branding.
 */
export function MotoIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    >
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M9 18h4" />
      <path d="M10.2 14.2h4.3l2.1 3.8" />
      <path d="M10.2 14.2 8.6 11.8H6.4" />
      <path d="M14.5 14.2 17.3 12.6 19 13.8" />
      <path d="M11.8 14.2 10.6 18" />
      <path d="M7.4 15.1 6 18" />
      <path d="M17.9 18H20" />
    </svg>
  );
}
