---
name: ui-motion
description: Design and implement accessible UI motion, micro-interactions, page transitions, loading states, and feedback animations. Use for frontend animation work with CSS, Tailwind, or Framer Motion.
---

# UI Motion

- Use motion to clarify state, hierarchy, continuity, or feedback—not as decoration.
- Prefer short transitions: roughly 120–200 ms for controls and 200–350 ms for panels or route-level elements.
- Animate transform and opacity when possible; avoid layout-thrashing properties.
- Preserve interaction during animations and prevent repeated clicks while mutations are pending.
- Respect `prefers-reduced-motion`; remove nonessential movement and keep state changes understandable without animation.
- Avoid animating every element at once. Stagger only small, meaningful groups.
- Keep enter/exit behavior consistent and ensure focus is moved or restored correctly for dialogs and overlays.
- Test keyboard use, mobile performance, reduced-motion mode, and light/dark themes.
