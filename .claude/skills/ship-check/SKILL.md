---
name: ship-check
description: Use before any commit that will deploy, or when asked to "ship", "deploy" or "check before push".
---

# Pre-deploy checklist
Run these in order and stop at the first failure:
1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npm run build`
5. Confirm no secrets are in the diff (`git diff --cached | grep -iE "postgres://|password|secret"` should be empty)
6. Confirm `.env*` is gitignored
7. Every page shows the data date and the disclaimer footer
8. Add any new design choice to `docs/decisions.md`

Then report: what passed, what's deployed, and anything the owner must do by hand (like Vercel env vars).