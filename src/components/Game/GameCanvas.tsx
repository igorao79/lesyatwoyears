"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { createGameEngine, GameEngine } from "@/game/engine";
import { GameScreen, INTERNAL_W, INTERNAL_H } from "@/game/types";
import TitleScreen from "./TitleScreen";
import MemoryScreen from "./MemoryScreen";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [screen, setScreen] = useState<GameScreen>(GameScreen.TITLE);
  const [heartsInfo, setHeartsInfo] = useState({ collected: 0, total: 6 });
  const [currentMemory, setCurrentMemory] = useState(0);

  // Initialize engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createGameEngine();
    engineRef.current = engine;
    engine.setCanvas(canvas);
    engine.onScreenChange = (s) => setScreen(s);
    engine.onHeartsChange = (c, t) => setHeartsInfo({ collected: c, total: t });
    engine.onMemoryChange = (idx) => setCurrentMemory(idx);
    engine.start();

    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  const handleStart = useCallback(() => {
    engineRef.current?.triggerStart();
  }, []);

  const handleContinue = useCallback(() => {
    engineRef.current?.triggerContinue();
  }, []);

  return (
    <div ref={containerRef} className="game-container">
      <canvas ref={canvasRef} className="game-canvas" />

      {screen === GameScreen.TITLE && (
        <TitleScreen onStart={handleStart} />
      )}

      {screen === GameScreen.MEMORY && (
        <MemoryScreen memoryIndex={currentMemory} onContinue={handleContinue} />
      )}

    </div>
  );
}
