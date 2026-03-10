"use client";

import { useEffect, useRef } from "react";

interface RivePlayerProps {
  src: string;
  width: number;
  height: number;
  className?: string;
}

export function RivePlayer({ src, width, height, className }: RivePlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const riveRef = useRef<{ cleanup?: () => void } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    import("@rive-app/canvas").then((rive) => {
      if (cancelled) return;

      const r = new rive.Rive({
        src,
        canvas,
        autoplay: true,
        layout: new rive.Layout({
          fit: rive.Fit.Contain,
          alignment: rive.Alignment.Center,
        }),
      });

      riveRef.current = r;
    }).catch(() => {});

    return () => {
      cancelled = true;
      riveRef.current?.cleanup?.();
    };
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
}
