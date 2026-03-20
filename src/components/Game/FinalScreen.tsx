"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { finalScreen } from "@/data/gameData";

export default function FinalScreen() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showHearts, setShowHearts] = useState(false);
  const [hearts, setHearts] = useState<
    { id: number; x: number; size: number; delay: number }[]
  >([]);

  useEffect(() => {
    // Reveal lines one by one
    const timers: ReturnType<typeof setTimeout>[] = [];
    finalScreen.lines.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setVisibleLines(i + 1);
        }, 1500 + i * 2000)
      );
    });

    // Show floating hearts after all lines
    timers.push(
      setTimeout(() => {
        setShowHearts(true);
        setHearts(
          Array.from({ length: 20 }).map((_, i) => ({
            id: i,
            x: 10 + Math.random() * 80,
            size: 14 + Math.random() * 18,
            delay: Math.random() * 4,
          }))
        );
      }, 1500 + finalScreen.lines.length * 2000)
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="overlay final-overlay">
      <div className="final-content">
        {/* Big heart */}
        <motion.div
          className="final-big-heart"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 150, damping: 8 }}
        >
          &#10084;
        </motion.div>

        {/* Lines */}
        <div className="final-lines">
          <AnimatePresence>
            {finalScreen.lines.slice(0, visibleLines).map((line, i) => (
              <motion.p
                key={i}
                className={`final-line ${i === finalScreen.lines.length - 1 ? "final-line-last" : ""}`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
              >
                {line}
              </motion.p>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Floating hearts */}
      {showHearts &&
        hearts.map((h) => (
          <div
            key={h.id}
            className="floating-heart"
            style={{
              left: `${h.x}%`,
              fontSize: `${h.size}px`,
              animationDelay: `${h.delay}s`,
              animationDuration: `${3 + Math.random() * 3}s`,
            }}
          >
            &#10084;
          </div>
        ))}
    </div>
  );
}
