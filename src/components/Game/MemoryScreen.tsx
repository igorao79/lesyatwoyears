"use client";

import { motion } from "motion/react";
import { memoryData } from "@/data/gameData";

interface MemoryScreenProps {
  memoryIndex: number;
  onContinue: () => void;
}

export default function MemoryScreen({ memoryIndex, onContinue }: MemoryScreenProps) {
  const data = memoryData[memoryIndex];
  if (!data) return null;

  const photoCount = data.photos.length;
  const isGrid = photoCount === 4;
  const isSplit = photoCount === 2;

  return (
    <div className="memory-overlay" onClick={onContinue}>
      <motion.div
        className="memory-photo-area"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="memory-photo-frame">
          {photoCount === 1 && (
            <img
              src={data.photos[0]}
              alt={data.title}
              className="memory-photo-img"
              style={data.grayscale ? { filter: "grayscale(1)" } : undefined}
            />
          )}
          {isSplit && (
            <div className="memory-photo-split">
              {data.photos.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`${data.title} ${i + 1}`}
                  className="memory-photo-img-half"
                />
              ))}
            </div>
          )}
          {isGrid && (
            <div className="memory-photo-grid">
              {data.photos.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`${data.title} ${i + 1}`}
                  className="memory-photo-img-quarter"
                />
              ))}
            </div>
          )}
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
