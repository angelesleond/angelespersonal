"use client";

import { useEffect, useState } from "react";

const COLORS = ["#c17a62", "#7c8f6e", "#d9a441", "#a66249", "#eef1e9"];

export default function Celebration({ cycleId, beneficiaryName }: { cycleId: string; beneficiaryName: string }) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const key = `regalos-amigas-celebrated-${cycleId}`;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, "1");
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [cycleId]);

  const pieces = Array.from({ length: 60 }, (_, i) => i);

  return (
    <>
      <div className="card" style={{ background: "var(--gold-soft)", textAlign: "center" }}>
        <h2 style={{ marginBottom: "0.3rem" }}>🎉 ¡Listo!</h2>
        <p style={{ margin: 0 }}>
          Ya juntamos todo el regalo de <strong>{beneficiaryName}</strong>.
        </p>
      </div>

      {showConfetti && (
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 200 }}>
          {pieces.map((i) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 0.6;
            const duration = 2.4 + Math.random() * 1.2;
            const color = COLORS[i % COLORS.length];
            const size = 6 + Math.random() * 6;
            const rotate = Math.random() * 360;
            return (
              <span
                key={i}
                style={{
                  position: "absolute",
                  top: "-5%",
                  left: `${left}%`,
                  width: size,
                  height: size * 0.4,
                  background: color,
                  borderRadius: 2,
                  transform: `rotate(${rotate}deg)`,
                  animation: `confetti-fall ${duration}s ease-in ${delay}s forwards`,
                }}
              />
            );
          })}
          <style>{`
            @keyframes confetti-fall {
              to {
                top: 105%;
                transform: rotate(720deg);
                opacity: 0.7;
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
