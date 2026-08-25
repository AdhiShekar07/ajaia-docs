# Submission Details

**Project:** Ajaia Docs
**Time Spent:** Completed within the 3.5 hour limit.

## Implementation Summary
- **Foundation:** Setup monorepo, TypeScript, Vite, Node/Express, Prisma & SQLite.
- **Backend APIs:** Full CRUD covering Users, Documents, and Shares logic.
- **Authentication:** Mocked `X-User-Id` interceptor workflow for fast unblocked development.
- **Frontend App:** Login user picking, responsive Dashboard, protected routing.
- **Document Editor:** TipTap rich-text integration with formatting toolbar, debounced auto-saves, and seamless loading/error handling.
- **File Import:** Client-side interpretation of `.md` (via `marked`) and `.txt` directly inserted into TipTap editor space.
- **Document Sharing:** Server enforced `VIEW` / `EDIT` restrictions managed by an intuitive modal dialog.
- **Verification:** TS checks and build compilation have passing 0 exit statuses. Integration test suite ensures API validity.

All provided restrictions and constraints from the initial scope were rigorously followed.
