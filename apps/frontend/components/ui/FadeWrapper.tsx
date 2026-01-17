"use client";

import { ReactNode, useRef } from "react";
import { motion, useInView } from "framer-motion";

type FadeWrapperProps = {
  children: ReactNode;
  className?: string;
  amount?: number;
};

export function FadeWrapper({
  children,
  className = "",
  amount = 0.35,
}: FadeWrapperProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { amount });

  return (
    <section ref={ref} className="relative">
      <motion.div
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        variants={{
          hidden: {
            opacity: 0,
            y: 24,
            filter: "blur(6px)",
          },
          visible: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
          },
        }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={className}
      >
        {children}
      </motion.div>
    </section>
  );
}
