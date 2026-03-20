"use client";

import { motion } from "motion/react";
import { gameMeta } from "@/data/gameData";

interface TitleScreenProps {
  onStart: () => void;
}

export default function TitleScreen({ onStart }: TitleScreenProps) {
  return (
    <div className="overlay" onClick={onStart}>
      <motion.div
        className="title-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {/* Decorative hearts */}
        <motion.div
          className="title-hearts"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        >
          <span className="pixel-heart-small">&#10084;</span>
          <span className="pixel-heart-small">&#10084;</span>
          <span className="pixel-heart-small">&#10084;</span>
        </motion.div>

        <motion.h1
          className="title-main"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          {gameMeta.title}
        </motion.h1>

        <motion.p
          className="title-subtitle"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          {gameMeta.subtitle}
        </motion.p>

        <motion.p
          className="title-date"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1.3, duration: 0.6 }}
        >
          {gameMeta.date}
        </motion.p>

        <motion.p
          className="title-prompt"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.5 }}
        >
          {gameMeta.startPrompt}
        </motion.p>
      </motion.div>
    </div>
  );
}
