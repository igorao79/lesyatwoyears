"use client";

interface HeartsCounterProps {
  collected: number;
  total: number;
}

export default function HeartsCounter({ collected, total }: HeartsCounterProps) {
  return (
    <div className="hearts-hud">
      <span className="hearts-icon">&#10084;</span>
      <span className="hearts-text">
        {collected}/{total}
      </span>
    </div>
  );
}
