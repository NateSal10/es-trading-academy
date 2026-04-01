---
description: How to scaffold and create new UI components effectively
---

When generating new a React component, follow these exact steps to minimize token usage and maximize structural integrity:

1. **Keep it Local Until Reused**
   Instead of immediately creating a standalone file under `src/components/`, define small helper components within the same file as the parent. Only abstract to an external file if it is clearly reusable across different modules.

2. **Component Creation Standards**
   If creating a standalone component file:
   - Use `export default function ComponentName()` format. Do not use `React.FC` or `const Component = () => {}` unless specifically overriding.
   - Use standard parameter destructuring: `function Button({ title, onClick, className = "" }) {}`.
   - Never import `React` explicitly when using React 17+.

3. **Standard Styling System**
   - Provide a `className` prop standard that merges cleanly. Example: ``className={`base-classes ${className}`}``.
   - Use standard modern dark mode logic. If the component accepts a `dm` (dark mode) prop as context, use ternary interpolation: ``${dm ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}``. 

4. **Verify Implementation**
   - Ensure the component uses dynamic generic imports (e.g., `lucide-react`) efficiently rather than creating custom SVGs (to save massive token usage).
