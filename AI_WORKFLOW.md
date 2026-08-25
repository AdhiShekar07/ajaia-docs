# AI Workflow

The development of Ajaia Docs followed a highly structured, phase-based AI implementation strategy:

1. **Strategic Scoping & Foundation:**
   The project was initialized with zero boilerplate to ensure minimal friction. Tools like Vite and Express were deliberately stripped of complex initial configurations.
   
2. **Backend API First:**
   I established the database Prisma schema and API endpoints before touching the frontend. This provided solid ground for deterministic behavior and simpler testing.
   
3. **Frontend Dashboard Execution:**
   Connected visual layer utilizing custom CSS. The design prioritized aesthetics without heavy CSS frameworks (e.g., Tailwind) to maintain strict control over styles, layout, and UX feedback.
   
4. **Editor and Core Logic:**
   TipTap was adopted due to its headless capabilities. Debounced auto-saving logic and unmanaged state flow ensured the UI did not lock during async API communication.
   
5. **Shares, Import, and Tests:**
   As isolated features, sharing APIs and client-side file parsing were integrated late in the lifecycle. Strict integration testing using Jest + Supertest was applied to simulate genuine boundary requests.

This workflow highlights the importance of working monotonically (Backend -> Client -> Editor -> Extensions).
