---
description: Advanced UI/UX standards to guarantee premium, modern, and engaging web designs
---

When the user requests UI modifications or new web designs, you MUST elevate the output beyond basic functional components. Strive to build interfaces that feel premium, responsive, and state-of-the-art.

# 1. Visual Excellence & Aesthetics
- **Premium Palettes:** Avoid generic RGB blocks (e.g., pure red/blue). Use curated, harmonious color palettes (HSL-based, sleek dark modes, vibrant gradients).
- **Typography:** Utilize modern typography styling (tracking, crisp font weights, line-height optimization) ensuring high readability and modern aesthetic. Use Google Fonts like Inter or Roboto.
- **Glassmorphism & Depth:** When appropriate, use subtle transparent backgrounds with backdrop blurs (e.g., `bg-white/10 backdrop-blur-md`) to create depth and hierarchy.

# 2. Dynamic & Interactive Design
- **Micro-interactions:** Add seamless hover states and active states to all interactive elements. Buttons should scale or shift visually on interaction (`hover:scale-105 active:scale-95 transition-all`).
- **Smooth Transitions:** Apply standard transition durations recursively using Tailwind (e.g., `transition-all duration-300 ease-in-out`).
- **Scroll Animations:** Integrate fade-ins and scroll-triggered animations to make the page feel alive.

# 3. Best Practices Compliance
- **No Empty States:** Avoid using generic placeholders. Use `generate_image` or external sources (like unsplash source URLs) if images are required.
- **Responsive by Default:** Ensure fluid mobile-first layouts using Tailwind flex and grid logic.
- **Accessibility (a11y):** Maintain sufficient contrast ratios and proper ARIA labels.
