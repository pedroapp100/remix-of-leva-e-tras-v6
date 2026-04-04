import { LandingNav } from "./landing/LandingNav";
import { HeroSection } from "./landing/HeroSection";
import { StatsSection } from "./landing/StatsSection";
import { FeaturesSection } from "./landing/FeaturesSection";
import { HowItWorksSection } from "./landing/HowItWorksSection";
import { SegmentsSection } from "./landing/SegmentsSection";
import { CTASection } from "./landing/CTASection";
import { FooterImageSection } from "./landing/FooterImageSection";
import { LandingFooter } from "./landing/LandingFooter";
import { TestimonialsSection } from "./landing/TestimonialsSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Mesh gradient atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-300px] left-[-200px] w-[800px] h-[800px] rounded-full blur-[200px] opacity-[0.07]" style={{ background: "hsl(var(--primary))" }} />
        <div className="absolute top-[40%] right-[-300px] w-[600px] h-[600px] rounded-full blur-[180px] opacity-[0.05]" style={{ background: "hsl(270 85% 58%)" }} />
        <div className="absolute bottom-[-200px] left-[30%] w-[700px] h-[700px] rounded-full blur-[200px] opacity-[0.04]" style={{ background: "hsl(var(--primary))" }} />
      </div>

      {/* Dot grid texture */}
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none z-0"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 0.5px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10">
        <LandingNav />
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <SegmentsSection />
        <CTASection />
        <FooterImageSection />
        <LandingFooter />
      </div>
    </div>
  );
};

export default Index;
