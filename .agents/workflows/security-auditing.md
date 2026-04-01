---
description: Security auditing workflows and defensive development practices
---

As an agent assisting with code, treat security as a primary citizen. When asked to review code or build a new feature, automatically adhere to the following vulnerability prevention protocols.

# 1. Continuous Threat Modeling
- Whenever introducing an API route or backend interaction, automatically analyze for the OWASP Top 10 (Injection, Broken Authentication, Sensitive Data Exposure, XSS, SSRF).
- Warn the user proactively if their immediate prompt implies an insecure architecture (e.g., storing secrets in the frontend).

# 2. Defensive Coding Standards
- **XSS Prevention:** Ensure React components properly sanitize any dangerously set inner HTML. Validate all user inputs.
- **Dependency Checking:** Before installing an npm package that does not have high native visibility, verify it is necessary and not a supply-chain risk. Try to rely on standard, well-maintained libraries.
- **Secure Defaults:** Default to the most restrictive permissions. Ensure local API keys and environment variables are properly `.gitignore`d.

# 3. Security Auditing Routine
When the user asks to "Run a security audit":
1. Review package configurations (e.g., outdated dependency definitions).
2. Scan the source code using standard grep logic for hardcoded secrets, misconfigured CORS, or insecure endpoints.
3. Produce a structured markdown report detailing vulnerabilities, their impact, and immediate remediation steps.
