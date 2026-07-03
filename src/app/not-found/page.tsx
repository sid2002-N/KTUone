"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SketchNotebook } from "@/components/ui-custom/sketch-elements";
import { HandwrittenText } from "@/components/ui-custom/handwritten-text";

export default function NotFound() {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center px-6"
      style={{ background: "oklch(0.96 0.02 78)" }}
    >
      <motion.div
        initial={mounted && !prefersReduced ? { opacity: 0, y: 12 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          animate={prefersReduced ? {} : { y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <SketchNotebook size={120} color="plum" />
        </motion.div>

        <h1 className="font-serif-display text-5xl sm:text-7xl font-bold tracking-tight text-foreground">
          404
        </h1>

        <h2 className="font-serif-display text-xl sm:text-2xl text-foreground/80">
          Page not found
        </h2>

        <HandwrittenText as="p" color="coral" className="text-lg rotate-[-2deg]">
          The page you're looking for seems to have been torn out.
        </HandwrittenText>

        <a
          href="/"
          className="mt-4 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition shadow-soft"
        >
          Back to KTU One
        </a>
      </motion.div>
    </div>
  );
}
