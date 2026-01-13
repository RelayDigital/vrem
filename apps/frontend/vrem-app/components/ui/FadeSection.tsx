"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

type FadeSectionProps = {
  headline: string;
  body: string;
  imgSrc: string;
  imgAlt?: string;
  reverse?: boolean; // image left vs right
};

export function FadeSection({
  headline,
  body,
  imgSrc,
  imgAlt = "",
  reverse,
}: FadeSectionProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  // "amount" controls how much of the section needs to be visible to count as "in view"
  const inView = useInView(ref, { amount: 0.35 });

  return (
    <section ref={ref} className="mx-auto w-full max-w-6xl px-6 py-24">
      <motion.div
        animate={inView ? "show" : "hide"} 
        initial="hide"
        variants={{
          hide: { opacity: 0, y: 24, filter: "blur(6px)" },
          show: { opacity: 1, y: 0, filter: "blur(0px)" },
        }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`grid items-center gap-12 md:grid-cols-2 ${
          reverse ? "md:[&>*:first-child]:order-2" : ""
        }`}
      >
        <div className="text-left">
          <h2 className="text-3xl font-semibold text-white md:text-5xl">
            {headline}
          </h2>
          <p className="mt-4 text-sm text-white/60 md:text-base">{body}</p>
        </div>

        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5">
          <img
            src={imgSrc}
            alt={imgAlt}
            className="h-[360px] w-full object-cover md:h-[420px]"
          />
        </div>
      </motion.div>
    </section>
  );
}
