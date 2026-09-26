# CareFlow Backend

CareFlow Backend API service built with **Express**, **Node.js**, and **TypeScript**.

Frontend Repository: [CareFlow](https://github.com/tasifhossan/CareFlow)

## Tech Stack

- **Server**: Express, Node.js (`ts-node-dev` for local dev)
- **Database & Storage**: [Neon Postgres](https://neon.tech) (serverless PostgreSQL), [Cloudinary](https://cloudinary.com)
- **Language**: TypeScript
- **Quality & Hooks**: ESLint, Prettier, Husky, lint-staged, GitHub Actions CI

## Directory Layout

```
src/
├── controllers/    # Route request handlers
├── lib/            # Helpers, utilities, and database connection clients
├── middleware/     # Custom Express middlewares (auth, validation, error handling)
├── routes/         # Express API router definitions
├── services/       # Domain business logic
└── index.ts        # Express server entrypoint
```

## Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- npm or yarn
- A [Neon Postgres](https://neon.tech) instance

### Installation & Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables:

   ```bash
   cp .env.example .env
   ```

   Set `DATABASE_URL` to your Neon Postgres connection string, configure `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, Cloudinary API credentials, and `PORT` (default: 5000).

3. Start local development server:
   ```bash
   npm run dev
   ```
   Test health check route at `http://localhost:5000/health`.

## Available Scripts

- `npm run dev`: Start Express server with auto-reload (`ts-node-dev`)
- `npm run build`: Compile TypeScript code to `/dist`
- `npm run start`: Launch compiled production server from `/dist/index.js`
- `npm run lint`: Run ESLint checks
- `npm run typecheck`: Run TypeScript type check (`tsc --noEmit`)
- `npm run test`: Run test suite

## CI Setup

Before CI will pass, the repo owner needs to add `JWT_ACCESS_SECRET_TEST` and `JWT_REFRESH_SECRET_TEST` as GitHub Actions repository secrets (**Settings** → **Secrets and variables** → **Actions**), with any random string value — these are test-only, never real secrets.
