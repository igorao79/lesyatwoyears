"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

const LINES = [
  "Леся...",
  "Я очень тебя люблю",
  "Спасибо за эти 2 невероятных года",
  "Ты — моё самое большое счастье",
  "С годовщиной!",
];

interface Props {
  textIndex: number;
  exploded: boolean;
}

export default function MeetingOverlay({ textIndex, exploded }: Props) {
  const [hearts, setHearts] = useState<
    { id: number; x: number; size: number; delay: number; duration: number }[]
  >([]);

  useEffect(() => {
    if (exploded && hearts.length === 0) {
      setHearts(
        Array.from({ length: 25 }).map((_, i) => ({
          id: i,
          x: 5 + Math.random() * 90,
          size: 10 + Math.random() * 16,
          delay: Math.random() * 3,
          duration: 4 + Math.random() * 4,
        }))
      );
    }
  }, [exploded, hearts.length]);

  if (textIndex < 0) return null;

  const isLast = textIndex === LINES.length - 1;

  return (
    <div className="meeting-overlay">
      {/* Text line */}
      <AnimatePresence mode="wait">
        <motion.div
          key={textIndex}
          className={`meeting-text ${isLast ? "meeting-text-last" : ""}`}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {LINES[textIndex]}
          {isLast && <span className="meeting-heart-emoji"> &#10084;</span>}
        </motion.div>
      </AnimatePresence>

      {/* Tap hint */}
      {!isLast && textIndex >= 0 && (
        <div className="meeting-hint">нажми...</div>
      )}

      {/* Heart rain */}
      {exploded &&
        hearts.map((h) => (
          <div
            key={h.id}
            className="heart-rain-drop"
            style={{
              left: `${h.x}%`,
              fontSize: `${h.size}px`,
              animationDelay: `${h.delay}s`,
              animationDuration: `${h.duration}s`,
            }}
          >
            &#10084;
          </div>
        ))}
    </div>
  );
}
