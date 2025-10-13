import React, { useEffect, useRef } from "react";

/**
 * Переход: только «краска», заливает слева направо.
 * onPaintDone() вызывается по окончании, чтобы скрыть слой.
 */
export default function TaxiTransition({ onPaintDone }) {
    const paintRef = useRef(null);

    useEffect(() => {
        const el = paintRef.current;
        if (!el) return;
        const handler = () => onPaintDone?.();
        el.addEventListener("animationend", handler);
        return () => el.removeEventListener("animationend", handler);
    }, [onPaintDone]);

    return (
        <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
            <div
                ref={paintRef}
                className="absolute inset-y-0 left-0 origin-left animate-paint"
                style={{
                    transform: "scaleX(0)",
                    background:
                        "linear-gradient(90deg, #10b981 0%, #10b981 60%, rgba(16,185,129,0.85) 80%, rgba(16,185,129,0) 100%)",
                    boxShadow: "0 0 40px 20px rgba(16,185,129,0.25)",
                }}
            />
            <style>{`
        @keyframes paint {
          0%   { transform: scaleX(0); }
          60%  { transform: scaleX(0.86); }
          100% { transform: scaleX(1); }
        }
        .animate-paint {
          animation: paint 600ms cubic-bezier(.2,.8,.2,1) forwards;
        }
      `}</style>
        </div>
    );
}
