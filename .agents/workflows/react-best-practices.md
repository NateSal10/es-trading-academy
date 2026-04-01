---
description: Best practices for React, Vite, and Tailwind development
---

# Core Principles
- Output MUST be concise. Write optimized, modern React, taking advantage of standard Hooks (useState, useEffect, useMemo, useCallback) and avoid deprecated features.
- Avoid unnecessary styling or inline styles. Always use Tailwind CSS utility classes.
- Eliminate boilerplate. Use minimal, functional components. Break down extremely complex logic into separate hooks, but do not prematurely abstract simple logic.
- Avoid "wrapper" div anxiety; use React.Fragment (`<>...</>`) where semantic markup doesn't require a wrapper.
- Use `lucide-react` for any UI icons unless otherwise specified.

# Formatting & Linting
- All code should be properly indented.
- Rely on modern ES6+ syntax (destructuring, spread operators, optional chaining, nullish coalescing).

# Design Tokens (Optimization)
- Reuse the primary palette tokens referenced in standard configs (e.g., `text-slate-800`, `bg-blue-500/10`).
- Stick to standard Tailwind spacing and sizing arrays to ensure visual consistency.
