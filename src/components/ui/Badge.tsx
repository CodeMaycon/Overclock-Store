import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "emerald" | "mint" | "amber" | "rose" | "neutral" | "cyan";
  size?: "sm" | "md";
  className?: string;
  pulse?: boolean;
}

export function Badge({
  children,
  variant = "emerald",
  size = "sm",
  className = "",
  pulse = false,
}: BadgeProps) {
  const variantStyles = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    mint: "bg-emerald-400/10 text-emerald-300 border-emerald-400/25",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/25",
    neutral: "bg-white/5 text-gray-300 border-white/10",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/25",
  };

  const sizeStyles = {
    sm: "text-xs px-2.5 py-0.5",
    md: "text-xs px-3 py-1 font-medium",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              variant === "emerald" || variant === "mint"
                ? "bg-emerald-400"
                : variant === "amber"
                ? "bg-amber-400"
                : "bg-rose-400"
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              variant === "emerald" || variant === "mint"
                ? "bg-emerald-500"
                : variant === "amber"
                ? "bg-amber-500"
                : "bg-rose-500"
            }`}
          />
        </span>
      )}
      {children}
    </span>
  );
}
