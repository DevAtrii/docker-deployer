"use client";

import { cn } from "@/lib/utils";

export default function IOSSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-10 w-10", className)}>
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute left-[46.5%] top-0 h-[30%] w-[7%] animate-ios-spinner rounded-full bg-foreground"
          style={{
            transform: `rotate(${i * 30}deg)`,
            transformOrigin: "center 165%",
            animationDelay: `${-1.1 + i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}
