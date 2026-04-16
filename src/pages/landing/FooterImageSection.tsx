import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import footerDelivery from "@/assets/footer-delivery.jpg";

const KenBurnsFooter = memo(function KenBurnsFooter() {
  const prefersReduced = useReducedMotion();
  return (
    <motion.img
      src={footerDelivery}
      alt="Entregador Leva e Traz"
      className="w-full h-full object-cover object-center"
      loading="lazy"
      width={1920}
      height={640}
      style={{ willChange: "transform" }}
      animate={
        prefersReduced
          ? { scale: [1, 1.04], x: [0, 10] }
          : { scale: [1, 1.12], x: [0, 40] }
      }
      transition={
        prefersReduced
          ? { duration: 20, ease: "linear", repeat: Infinity, repeatType: "reverse" }
          : { duration: 14, ease: "linear", repeat: Infinity, repeatType: "reverse" }
      }
    />
  );
});

export function FooterImageSection() {
  return (
    <section className="relative z-10 w-full h-[550px] sm:h-[700px] overflow-hidden">
      <KenBurnsFooter />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/70 to-transparent h-[40%]" />
      <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-background via-background/60 to-transparent" />
    </section>
  );
}
