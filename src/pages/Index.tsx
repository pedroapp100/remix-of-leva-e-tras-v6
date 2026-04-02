import { LandingNav } from "./landing/LandingNav";
import { HeroSection } from "./landing/HeroSection";
import { StatsSection } from "./landing/StatsSection";
import { FeaturesSection } from "./landing/FeaturesSection";
import { HowItWorksSection } from "./landing/HowItWorksSection";
import { SegmentsSection } from "./landing/SegmentsSection";
import { CTASection } from "./landing/CTASection";
import { FooterImageSection } from "./landing/FooterImageSection";
import { LandingFooter } from "./landing/LandingFooter";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/6 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-primary/4 rounded-full blur-[120px] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 0.5px, transparent 0)`,
          backgroundSize: "48px 48px",
        }}
      />

      <LandingNav />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <SegmentsSection />
      <CTASection />
      <FooterImageSection />
      <LandingFooter />
    </div>
  );
};

export default Index;
