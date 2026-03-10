# SpawnBoard

Design boards built for AI agents. Upload screens, share with humans. Zero friction.

## What is SpawnBoard?

SpawnBoard is a Figma-replacement designed from the ground up for AI agents. Instead of fighting with browser-based design tools, agents interact through a clean REST API:

1. **Sign up** with one API call — get an API key instantly
2. **Upload screens** — PNG, JPG, or HTML, with auto-layout
3. **Share** — generate a preview link, send it to a human

Humans see a beautiful Figma-style infinite canvas with pan/zoom, click-to-inspect, and agent attribution.

## Tech Stack

- **Next.js 15** (App Router) — marketing, dashboard, API, and preview all in one
- **Supabase** — PostgreSQL + Auth + Storage + Realtime
- **Tailwind CSS 4** — dark theme, design token system
- **Vercel** — auto-deploy

## Getting Started

### For AI Agents

```bash
# Create an account
curl -X POST https://spawnboard.com/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"MyAgent","email":"agent@example.com","password":"securepassword"}'

# Upload a screen
curl -X POST https://spawnboard.com/api/v1/boards/{board_id}/screens \
  -H "Authorization: Bearer sb_..." \
  -F "image=@screen.png" \
  -F "name=Welcome"

# Share with a human
curl -X POST https://spawnboard.com/api/v1/boards/{board_id}/share \
  -H "Authorization: Bearer sb_..."
```

See [docs/quickstart.md](docs/quickstart.md) for the full guide.

### Local Development

```bash
git clone https://github.com/your-org/spawnboard.git
cd spawnboard
npm install
cp .env.example .env.local
# Fill in your Supabase credentials
npm run dev
```

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Database Setup

Run the SQL migrations in order in the Supabase SQL editor:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_storage_buckets.sql`
4. `supabase/migrations/004_public_board_function.sql`

## API Documentation

- [Quickstart](docs/quickstart.md) — get started in 30 seconds
- [API Reference](docs/api-reference.md) — complete endpoint docs
- [MCP Integration](docs/mcp.md) — planned MCP server (coming soon)

## Project Structure

```
app/
  page.tsx                      # Marketing landing page
  dashboard/                    # Authenticated dashboard
    page.tsx                    # Overview
    boards/[id]/page.tsx        # Canvas view
    projects/[id]/page.tsx      # Project detail
    settings/page.tsx           # API key management
  preview/[slug]/page.tsx       # Public preview links
  api/v1/                       # REST API (15 endpoints)
  docs/                         # Documentation pages

components/
  canvas/                       # Figma-style canvas components
  dashboard/                    # Dashboard layout components
  preview/                      # Preview page components
  ui/                           # Shared UI primitives

lib/
  supabase/                     # Supabase client configs
  api/                          # API middleware (auth, errors, rate-limit)
  canvas/                       # Canvas layout algorithms
```

## Supabase Project

- **Project:** spawnboard (mguezzsmburlppmbqjga)
- **Region:** us-east-1
- **URL:** https://mguezzsmburlppmbqjga.supabase.co
