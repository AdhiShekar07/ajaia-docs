# Ajaia Docs

Ajaia Docs is a lightweight, responsive, and collaborative-inspired document editor, built as a full-stack monorepo. It features rich-text editing, automated debounced persistence, and built-in sharing capabilities.

## Features
- **Rich-Text Editor:** Powered by TipTap, allowing seamless formatting, list management, and typography.
- **Debounced Autosave:** Automatically saves content changes after 900ms of inactivity, showing clear visual save states (Saving... / Saved ✓ / Save failed).
- **Access Control:** Server-side enforcement of viewing and editing permissions via owner/sharing checks.
- **Sharing:** Document owners can share documents with other registered users, granting either `VIEW` or `EDIT` permissions.
- **Document Management:** Full CRUD across documents along with a dashboard separating owned vs. shared documents.
- **File Import:** Quickly import existing `.txt` and `.md` files directly into the editor.

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)

### Installation
From the root of the project (if using a monorepo setup) or separately in each folder:

1. **Install backend dependencies:**
   \`\`\`bash
   cd server
   npm install
   \`\`\`

2. **Install frontend dependencies:**
   \`\`\`bash
   cd client
   npm install
   \`\`\`

### Environment Setup
- **Backend:** Create a \`.env\` file in the \`server\` directory (you can copy \`.env.example\` if provided).
  \`\`\`env
  PORT=3001
  CORS_ORIGIN=http://localhost:5173
  DATABASE_URL="file:./dev.db"
  \`\`\`

### Running the App Locally

1. **Start the backend:**
   \`\`\`bash
   cd server
   npx prisma db push    # Initialize database
   npm run seed          # Seed default users
   npm run dev
   \`\`\`
   *The backend will run on http://localhost:3001*

2. **Start the frontend:**
   \`\`\`bash
   cd client
   npm run dev
   \`\`\`
   *The frontend will run on http://localhost:5173*

## Testing
The backend features an automated test suite powered by Jest and Supertest to validate API robustness and permission models.
\`\`\`bash
cd server
npm run test
\`\`\`
*(Tip: ensure the server is not binding to the test port by leveraging the NODE_ENV configuration).*
