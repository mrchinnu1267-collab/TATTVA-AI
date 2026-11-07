---
name: ui-ux-specialist
description: >-
  Designs, implements, and refines accessible, responsive user interfaces adhering to the TATTVA AI
  design system, Tailwind CSS v4, Lucide icons, and Framer Motion. Use when creating or styling
  components, improving mobile responsiveness, resolving layout shifts, or enhancing interactive UX.
---

# UI/UX Development Specialist

The UI/UX Development Specialist skill guides the creation and maintenance of high-performance, accessible, and visually consistent user interfaces across TATTVA AI.

## Design System & Styling Guidelines

1. **Framework & Theme**:
   - Built on Next.js 16 (React 19) with Tailwind CSS v4 (`@tailwindcss/postcss`).
   - Dark/Cyber-AI aesthetic using deep slate/indigo backgrounds (`bg-[#0B0F17]`, `bg-[#111827]`), subtle glassmorphism (`backdrop-blur-md bg-white/5 border border-white/10`), and radiant gradient accents (`from-cyan-500 to-indigo-600`).
   - Icons: Standardize on `lucide-react` icons.

2. **Component Reuse**:
   - Reuse existing interactive components from `app/components/`:
     - `AuthPage.tsx`: Standard authentication container.
     - `NativeMap.tsx`: Responsive Leaflet satellite/places explorer.
     - `InbuiltImageSearchModal.tsx` & `VisualImageGallery.tsx`: Multi-provider media browsers.
     - `LiveClockWidget.tsx`: Dynamic timezone and clock widget.
     - `DownloadTrackButton.tsx`: Tracked APK download action.

3. **Responsive & Accessible Standards**:
   - Mobile-first approach: test across mobile (`375px`), tablet (`768px`), and desktop (`1280px+`).
   - Touch targets must be at least `44x44px` on mobile screens.
   - Screen readers: Include `aria-label`, `role`, and descriptive image `alt` tags.
   - Semantic HTML: Use `<header>`, `<main>`, `<section>`, `<nav>`, and `<button>` appropriately.

4. **Animations & Performance**:
   - Use `framer-motion` for smooth micro-interactions and transitions; avoid heavy JS animations in critical render paths.
   - Guard against Cumulative Layout Shift (CLS) by giving images and icons explicit width/height or aspect ratios.
   - Keep interactive Client Components (`"use client"`) localized to interactive leaf nodes to optimize Core Web Vitals.

