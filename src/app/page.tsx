"use client";

import dynamic from "next/dynamic";

const GameCanvas = dynamic(
  () => import("@/components/Game/GameCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="game-loading">
        <p className="loading-text">Загрузка...</p>
      </div>
    ),
  }
);

export default function HomePage() {
  return <GameCanvas />;
}
