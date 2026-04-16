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

const WA_LINK = "https://wa.link/c0nk5e";

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

      {/* Floating WhatsApp button */}
      <a
        href={WA_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar no WhatsApp"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-transform duration-200 hover:scale-110 active:scale-95"
        style={{ background: "#25D366", boxShadow: "0 8px 32px rgba(37,211,102,0.4)" }}
      >
        <svg viewBox="0 0 32 32" fill="white" className="h-7 w-7" aria-hidden="true">
          <path d="M16 2C8.268 2 2 8.268 2 16c0 2.478.664 4.797 1.82 6.797L2 30l7.41-1.793A13.933 13.933 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2Zm0 25.6a11.556 11.556 0 0 1-5.883-1.607l-.422-.252-4.397 1.064 1.102-4.27-.276-.44A11.564 11.564 0 0 1 4.4 16C4.4 9.593 9.593 4.4 16 4.4S27.6 9.593 27.6 16 22.407 27.6 16 27.6Zm6.34-8.64c-.347-.174-2.055-1.013-2.374-1.129-.319-.116-.551-.174-.783.174-.232.347-.899 1.129-1.102 1.362-.203.232-.406.26-.753.087-.347-.174-1.464-.54-2.788-1.72-1.03-.917-1.726-2.05-1.929-2.397-.203-.347-.022-.535.153-.708.157-.155.347-.406.521-.608.174-.203.232-.347.347-.579.116-.232.058-.434-.029-.608-.087-.174-.783-1.887-1.073-2.584-.282-.678-.569-.586-.783-.596l-.667-.011c-.232 0-.608.087-.927.434-.319.347-1.218 1.19-1.218 2.9 0 1.71 1.247 3.363 1.42 3.595.174.232 2.455 3.748 5.949 5.256.831.359 1.48.573 1.986.733.834.265 1.594.228 2.195.138.669-.1 2.055-.84 2.345-1.652.29-.812.29-1.508.203-1.652-.086-.145-.319-.232-.667-.406Z" />
        </svg>
      </a>
    </div>
  );
};

export default Index;
