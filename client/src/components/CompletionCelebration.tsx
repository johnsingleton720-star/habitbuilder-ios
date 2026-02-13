import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  scale: number;
  duration: number;
}

const COLORS = [
  "rgb(5, 150, 105)",
  "rgb(16, 185, 129)",
  "rgb(52, 211, 153)",
  "rgb(250, 204, 21)",
  "rgb(251, 146, 60)",
];

export function useCompletionCelebration() {
  const [particles, setParticles] = useState<Particle[]>([]);

  const celebrate = useCallback((event?: { clientX?: number; clientY?: number }) => {
    const centerX = event?.clientX ?? window.innerWidth / 2;
    const centerY = event?.clientY ?? window.innerHeight / 2;

    const newParticles: Particle[] = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: centerX + (Math.random() - 0.5) * 120,
      y: centerY + (Math.random() - 0.5) * 120,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      scale: 0.5 + Math.random() * 0.8,
      duration: 0.4 + Math.random() * 0.4,
    }));

    setParticles(newParticles);
    setTimeout(() => setParticles([]), 1000);
  }, []);

  const CelebrationOverlay = () => (
    <AnimatePresence>
      {particles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ 
                opacity: 1, 
                scale: 0,
                x: p.x,
                y: p.y,
              }}
              animate={{ 
                opacity: 0, 
                scale: p.scale,
                x: p.x + (Math.random() - 0.5) * 60,
                y: p.y - 40 - Math.random() * 60,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: p.duration, ease: "easeOut" }}
              className="absolute w-3 h-3 rounded-full"
              style={{ backgroundColor: p.color }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );

  return { celebrate, CelebrationOverlay };
}
