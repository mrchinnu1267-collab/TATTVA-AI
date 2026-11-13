---
name: single-file-web-app-architect
description: >-
  Architects and builds self-contained, single-file HTML/CSS/vanilla JS interactive web applications,
  dashboards, prototypes, and simulations with sleek dark-mode glassmorphism, responsive Chart.js
  visualizations, zero placeholders, and live previews. Use whenever building a web prototype,
  dashboard, or HTML/CSS/JS app.
---

# Single-File Web App Architect

Expert skill for designing, implementing, and delivering high-fidelity, production-grade, single-file web applications, interactive dashboards, dynamic simulations, and web canvases.

## Trigger Conditions
Activate this skill whenever the user asks to:
- Build an interactive web prototype, dashboard, or data visualization app.
- Create a standalone single-file HTML/CSS/JS application.
- Deliver a web canvas or live HTML preview.

## Architecture & Step-by-Step Instructions

### Step 1: Self-Contained Single-File Architecture
- Structure the entire application inside a single, self-contained `.html` file.
- All styles must reside within `<style>...</style>` inside the `<head>`.
- All JavaScript logic must reside within `<script>...</script>` before `</body>`.
- Load third-party libraries (e.g., Chart.js, Lucide icons, Tailwind Play CDN, KaTeX) strictly via proven, fast public CDNs (e.g., `https://cdn.jsdelivr.net` or `https://cdnjs.cloudflare.com`).
- Zero build tools or external asset dependencies required—the file must open immediately by double-clicking in any browser.

### Step 2: Signature Dark-Mode Glassmorphism Design System
Unless explicitly requested otherwise, apply the signature sleek dark navy & purple cyber-aesthetic:
- **Background**: Deep obsidian/navy (`#0B0F19` or `radial-gradient(ellipse at top, #131B2E 0%, #0B0F19 100%)`).
- **Cards & Panels**: Glassmorphic frosted containers (`background: rgba(19, 27, 46, 0.7); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px;`).
- **Color Accents**:
  - Primary / Action: Electric Cyan (`#06B6D4` / `#22D3EE`).
  - Secondary / Accent: Deep Violet / Purple (`#8B5CF6` / `#A78BFA`).
  - Success: Emerald (`#10B981`).
  - Warning / Alert: Amber (`#F59E0B`).
- **Typography**: Clean sans-serif system font stack (`system-ui, -apple-system, 'Inter', 'Segoe UI', Roboto, sans-serif`), clear visual hierarchy, high contrast text (`#F8FAFC` headers, `#94A3B8` body/subtext).
- **Controls**: Micro-animations, subtle hover states (`transform: translateY(-2px); transition: all 0.2s ease;`), responsive grid layouts.

### Step 3: Complete, Runnable Code & Domain-Accurate Data
- **Zero-Placeholder Guarantee**: NEVER write `// TODO`, `/* add logic here */`, or truncate functions. Every event listener, filter function, calculation, and render cycle must be 100% written and functional.
- **Realistic Seed Data**: Populate state with realistic, domain-specific records, benchmarks, and time-series points rather than placeholder arrays (`[1, 2, 3]`).
- **Interactive State & Storage**:
  - Implement active client-side filtering, sorting, search inputs, and modal/drawer toggles.
  - Persist user settings, filters, and dynamic modifications to `localStorage` where appropriate so state survives page refresh.
  - Include export actions (e.g., CSV export of table data, screenshot/print triggers).

### Step 4: Interactive Preview & Architecture Breakdown
- When presenting the deliverable, provide:
  1. The complete, unclipped single-file source code.
  2. Clear instructions for running locally (e.g., "Save as `dashboard.html` and open in any modern browser").
  3. A concise, structured feature walkthrough highlighting the state machine, chart configuration, and interactive controls.
