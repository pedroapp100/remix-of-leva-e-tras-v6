import { BrandedLoader } from "@/components/shared/BrandedLoader";

export function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-24 animate-in fade-in duration-300">
      <BrandedLoader size="lg" text="Carregando página..." />
    </div>
  );
}
