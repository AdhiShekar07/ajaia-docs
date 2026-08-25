# Architecture Overview

## Tech Stack
- **Frontend:** React, Vite, TypeScript, Axios, React Router, TipTap (ProseMirror-based).
- **Backend:** Node.js, Express, TypeScript, Prisma.
- **Database:** SQLite (file-based).

## System Design
The application utilizes a decoupled client-server architecture. 

### Data Layer
- **Prisma** interacts with SQLite.
- **Models:**
  - `User`: Base identity.
  - `Document`: The core resource, stringified TipTap HTML content, and an `ownerId`.
  - `Share`: A many-to-many join model linking `User` and `Document` with a `permission` field (`VIEW` or `EDIT`).

### Backend (Server)
- Implements a RESTful JSON API.
- All mutating endpoints execute via a strictly un-nested router architecture.
- **Authentication**: Lightweight mock token system via the `X-User-Id` header (for development simplicity as requested).
- **Authorization**: Document access checks happen at the Prisma query level. Fetch verifies the user is either the `ownerId` or exists in the `shares` table for that `documentId`.

### Frontend (Client)
- **State Management**: React's native hooks (`useState`, `useRef`). Global auth is pulled from `localStorage`.
- **API Communication**: Outbound requests are mediated by an Axios instance containing an interceptor that automatically attaches `X-User-Id`.
- **Routing**: `react-router-dom` handles views conditionally restricted by a `<ProtectedRoute>` layout.
- **Editor Integration**: TipTap drives the editor in uncontrolled-like bounds. Saving operates on a 900ms debounced auto-save hook, sending the document title and inner HTML to the server.

### Persistence Strategy
- Content is preserved exactly as the generated HTML strings from TipTap.
- This HTML structure perfectly reinstantiates node attributes natively, allowing lightweight string saves without complex JSON parsing overhead back and forth.
