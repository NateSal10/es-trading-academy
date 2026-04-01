---
description: How to check, build, and deploy the application
---

Follow this strict chronological order when the user asks to "build", "deploy", or "push".

1. **Lint the Code**
// turbo
`npm run lint`

2. **Build the Code locally to ensure stability**
// turbo
`npm run build`

3. **Stage all working changes**
// turbo
`git add .`

4. **Commit with a descriptive message**
If the user did not supply a message, generate a 1-line semantic breakdown of changes (e.g., "feat: added component-creation workflow").
`git commit -m "[message]"`

5. **Deploy via Git Push**
// turbo
`git push`

*Note: Since the codebase is linked to continuous deployment (like Vercel/Pages), pushing directly to the `main` branch is the standard mechanism to trigger a live site update.*
