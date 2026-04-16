import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'danger' | 'premium';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
    const variants = {
      default: "bg-blue-600 text-white hover:bg-blue-700 shadow-md",
      outline: "border border-slate-700 hover:bg-slate-800 text-slate-100",
      ghost: "hover:bg-slate-800 hover:text-slate-100 text-slate-300",
      danger: "bg-red-600/90 text-white hover:bg-red-600 shadow-md",
      premium: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:opacity-90 shadow-lg glow"
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], "h-10 py-2 px-4", className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
