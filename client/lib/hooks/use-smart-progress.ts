import { useRef, useState, useCallback } from 'react';

type SmartProgressOptions = {
  fps?: number; // smoothness
  fastTarget?: number; // lompatan awal (ex: 70)
  slowStartAt?: number; // mulai melambat (ex: 75)
  maxBeforeDone?: number; // mentok sebelum task selesai (ex: 92)
};

export const useSmartProgress = ({
  fps = 5,
  fastTarget = 85,
  slowStartAt = 85,
  maxBeforeDone = 90
}: SmartProgressOptions = {}) => {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);

  const runWithProgress = useCallback(
    async <T>(task: () => Promise<T>) => {
      setProgress(0);

      const frameTime = 1000 / fps;

      let current = 0;
      let last = performance.now();

      const animate = (now: number) => {
        const delta = now - last;
        if (delta < frameTime) {
          frameRef.current = requestAnimationFrame(animate);
          return;
        }

        last = now;

        setProgress((p) => {
          current = p;

          // 🚀 PHASE 1 — cepat banget
          if (current < fastTarget) {
            return Math.min(current + 12, fastTarget);
          }

          // 🐢 PHASE 2 — makin pelan
          if (current < slowStartAt) {
            return Math.min(current + 4, slowStartAt);
          }

          // 🐌 PHASE 3 — super lambat (illusion of heavy work)
          if (current < maxBeforeDone) {
            return Math.min(current + 1, maxBeforeDone);
          }

          return current;
        });

        frameRef.current = requestAnimationFrame(animate);
      };

      frameRef.current = requestAnimationFrame(animate);

      // 🔥 JALANKAN TASK ASLI
      const result = await task();

      // stop animasi
      if (frameRef.current) cancelAnimationFrame(frameRef.current);

      setProgress(100);

      setTimeout(() => setProgress(0), 500);

      return result;
    },
    [fps, fastTarget, slowStartAt, maxBeforeDone]
  );

  return { progress, runWithProgress };
};
