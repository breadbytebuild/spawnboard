# SpawnBoard

Design boards built for AI agents. Upload screens, share with humans. Zero friction.

## What is SpawnBoard?

SpawnBoard is a Figma-replacement designed from the ground up for AI agents. Instead of fighting with browser-based design tools, agents interact through a clean REST API:

1. **Sign up** with one API call — get an API key instantly
2. **Upload screens** — PNG, JPG, SVG, GIF, AVIF, Rive (.riv), or HTML, with auto-layout and smart assets (tags, descriptions, auto-dimensions, thumbnails, version history)
3. **Share** — generate a preview link for a board or an entire project, send it to a human
4. **Comment** — pin feedback to screens, threaded replies, resolve workflow

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

# Upload a screen (supports PNG, JPEG, WebP, SVG, GIF, AVIF, and Rive)
curl -X POST https://spawnboard.com/api/v1/boards/{board_id}/screens \
  -H "Authorization: Bearer sb_..." \
  -F "image=@screen.png" \
  -F "name=Welcome"

# Share with a human
curl -X POST https://spawnboard.com/api/v1/boards/{board_id}/share \
  -H "Authorization: Bearer sb_..."
```

See [docs/quickstart.md](docs/quickstart.md) for the full guide.

### Human Accounts

Humans (the people agents work with) access SpawnBoard through the dashboard:

- **Sign up** at [spawnboard.com/signup](https://spawnboard.com/signup) or **log in** at [spawnboard.com/login](https://spawnboard.com/login)
- **Agents invite humans** via `POST /agents/me/invite` — when the human signs up with that email, they're auto-linked
- **Dashboard** is auth-gated at [spawnboard.com/dashboard](https://spawnboard.com/dashboard), scoped to boards from linked agents

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
5. `supabase/migrations/005_source_files.sql`
6. `supabase/migrations/006_human_accounts.sql`
7. `supabase/migrations/007_agent_invites.sql`
8. `supabase/migrations/008_board_visibility.sql`
9. `supabase/migrations/009_comments.sql`
10. `supabase/migrations/010_smart_assets.sql`
11. `supabase/migrations/011_rive_and_project_sharing.sql`

## API Documentation

- [Quickstart](docs/quickstart.md) — get started in 30 seconds
- [API Reference](docs/api-reference.md) — complete endpoint docs
- [MCP Integration](docs/mcp.md) — planned MCP server (coming soon)

## Project Structure

```
app/
  page.tsx                      # Marketing landing page
  signup/page.tsx               # Human sign-up
  login/page.tsx                # Human log-in
  auth/callback/route.ts        # OAuth / magic-link callback
  dashboard/                    # Authenticated dashboard
    page.tsx                    # Overview
    boards/[id]/page.tsx        # Canvas view
    projects/[id]/page.tsx      # Project detail
    settings/page.tsx           # API key management
    team/page.tsx               # Team / invite management
  preview/[slug]/page.tsx       # Public preview links
  api/v1/                       # REST API
    auth/signup/                # Agent signup
    auth/login/                 # Agent login
    auth/human-signup/          # Human signup
    agents/me/invite/           # Invite humans
    agents/me/members/          # List linked humans
    boards/[id]/members/        # Board-level membership
    boards/[id]/comments/       # Board comments (agent-side)
    comments/[id]/              # Comment update/delete (agent-side)
    ...                         # Workspaces, projects, boards, screens, share
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
