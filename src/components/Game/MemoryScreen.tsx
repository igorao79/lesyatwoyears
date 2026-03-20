"use client";

import { motion } from "motion/react";
import { memoryData } from "@/data/gameData";

interface MemoryScreenProps {
  memoryIndex: number;
  onContinue: () => void;
}

const placeholderColors = [
  "#e8836b", "#7eb8c9", "#c5a3d9", "#a0c880", "#f0c060", "#f08080",
];

export default function MemoryScreen({ memoryIndex, onContinue }: MemoryScreenProps) {
  const data = memoryData[memoryIndex];
  if (!data) return null;

  const bgColor = placeholderColors[memoryIndex % placeholderColors.length];

  return (
    <div className="memory-overlay" onClick={onContinue}>
      {/* Photo at top */}
      <motion.div
        className="memory-photo-area"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="memory-photo-frame">
          <div
            className="memory-photo-placeholder"
            style={{ backgroundColor: bgColor }}
          >
            <span className="memory-photo-label">{data.photoPlaceholder}</span>
          </div>
        </div>

        <motion.h2
          className="memory-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          {data.title}
        </motion.h2>

        <motion.p
          className="memory-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.85 }}
          transition={{ delay: 0.45, duration: 0.4 }}
        >
          {data.text}
        </motion.p>
      </motion.div>

      {/* Continue prompt at bottom */}
      <motion.p
        className="memory-continue"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        Нажми чтобы продолжить
      </motion.p>
    </div>
  );
}
