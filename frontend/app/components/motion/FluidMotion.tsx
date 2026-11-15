"use client";

import React from "react";

interface MotionProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Level 1: Major Navigation Transition
 * Used when switching major application sections (New Chat, Workspace, Maps).
 * Smooth 420ms fade and subtle scale expansion.
 */
export function FluidPageTransition({ children, className = "", style }: MotionProps) {
  return (
    <div
      className={`animate-fluid-page-in w-full h-full ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * Level 2: Component Dropdown & Popover Transition
 * Used for menus, model selectors, and attachment drawers.
 * 220ms fluid entrance.
 */
export function FluidDropdown({ children, className = "", style }: MotionProps) {
  return (
    <div
      className={`animate-fluid-dropdown ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * Level 2: Component Modal & Dialog Transition
 * Used for modals, confirmation boxes, and settings cards.
 */
export function FluidDialog({ children, className = "", style }: MotionProps) {
  return (
    <div
      className={`animate-fluid-dialog ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * Level 3: Micro-Interaction Button
 * Subtle compression on press (120ms), gentle hover lift (180ms), and accessible focus ring.
 */
interface FluidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "glass";
}

export function FluidButton({
  children,
  className = "",
  variant = "ghost",
  ...props
}: FluidButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center font-medium transition-all duration-150 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500 fluid-press active:scale-[0.97]";

  let variantClasses = "";
  switch (variant) {
    case "primary":
      variantClasses =
        "bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 shadow-xs";
      break;
    case "secondary":
      variantClasses =
        "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800/80 dark:hover:bg-neutral-700/80 dark:text-neutral-200 border border-black/5 dark:border-white/10";
      break;
    case "glass":
      variantClasses =
        "fluid-glass hover:bg-white/95 dark:hover:bg-[#181920]/95 text-neutral-800 dark:text-neutral-200 shadow-xs";
      break;
    case "ghost":
    default:
      variantClasses =
        "hover:bg-neutral-100 dark:hover:bg-white/[0.06] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white";
      break;
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
