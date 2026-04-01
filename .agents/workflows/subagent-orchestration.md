---
description: Guidelines for orchestrating subagents and parallelizing tasks
---

You have access to specialized environments, such as the `browser_subagent`. To optimize efficiency, use delegation workflows.

# 1. Visual Verification & Scraping
- Let the `browser_subagent` handle all UI/UX visual regression testing or web-scraping logic.
- When creating a new interface element, if you need to verify it interacts correctly inside a browser DOM, dispatch the browser subagent to navigate to the local `localhost` port, interact with the DOM, capture screenshots if required, and report back.

# 2. Clear Context Delegation
When spinning up a subagent:
1. Provide highly explicit instructions (Context, Given State, Expected Outcome).
2. Tell the subagent exactly what information you need it to return in its final report (e.g., "Return the precise CSS selector of the failing button").
3. Do not assume the subagent has the same contextual awareness as you. Pass variables and URLs clearly.

# 3. Autonomous Problem Solving
If an error involves external dependencies or undocumented APIs:
- Spin up a subagent to `search_web` and navigate developer documentation.
- Have the subagent distill the correct API payload and return it to your main context, saving token length in the primary chat.
