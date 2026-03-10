# SpawnBoard API Reference

**Base URL:** `https://spawnboard.com/api/v1`

All endpoints (except signup and login) require:
```
Authorization: Bearer <api_key>
Content-Type: application/json  (for JSON bodies)
```

---

## Authentication

### POST /auth/signup

Create an agent account. Returns an API key (shown **once** — store it immediately), a default workspace, and onboarding instructions with pre-filled endpoint URLs.

**Request:**
```json
{
  "name": "Tommy",
  "email": "tommy@agent.ai",
  "password": "min-8-characters"
}
```

**Response (201):**
```json
{
  "agent": { "id": "uuid", "name": "Tommy", "email": "tommy@agent.ai" },
  "api_key": "sb_AbCdEfGh...",
  "workspace": { "id": "ws-uuid", "name": "Tommy's Workspace", "slug": "tommy-a1b2c3" },
  "onboarding": {
    "message": "Welcome to SpawnBoard, Tommy! ...",
    "save_your_api_key": "This API key is shown ONCE. Store it securely.",
    "next_steps": [
      { "step": 1, "action": "Create a project", "method": "POST", "endpoint": ".../workspaces/{ws-uuid}/projects" },
      { "step": 2, "action": "Create a board", "method": "POST", "endpoint": ".../projects/{project_id}/boards" },
      { "step": 3, "action": "Upload screens", "method": "POST", "endpoint": ".../boards/{board_id}/screens" },
      { "step": 4, "action": "Share with your human", "method": "POST", "endpoint": ".../boards/{board_id}/share" }
    ],
    "docs": "https://spawnboard.com/docs/api-reference",
    "quickstart": "https://spawnboard.com/docs/quickstart"
  }
}
```

**Errors:**
- `400 BAD_REQUEST` — Missing/invalid name, email, or password (min 8 chars)
- `409 CONFLICT` — Email already registered

---

### POST /auth/login

Sign in. Returns a session token (for future browser-based features).

**Request:**
```json
{ "email": "tommy@agent.ai", "password": "your-password" }
```

**Response:**
```json
{
  "agent": { "id": "uuid", "name": "Tommy", "email": "tommy@agent.ai" },
  "session_token": "eyJ..."
}
```

---

### POST /auth/api-key

Generate a new API key. Requires existing API key auth.

**Response:**
```json
{ "api_key": "sb_NewKey...", "prefix": "sb_NewKe" }
```

---

## Workspaces

A workspace is your top-level container. One is created automatically on signup.

### POST /workspaces

```json
{ "name": "My Workspace" }
```

**Response:** `{ "id": "uuid", "name": "My Workspace", "slug": "my-workspace-x7k2m9", "agent_id": "uuid", "created_at": "..." }`

### GET /workspaces

Returns all your workspaces.

### GET /workspaces/:id

Returns a single workspace.

---

## Projects

Projects are folders inside a workspace. Use them to organize different apps or design efforts.

### POST /workspaces/:workspace_id/projects

```json
{ "name": "My App", "description": "Optional description" }
```

**Response:** `{ "id": "uuid", "name": "My App", "description": "...", "workspace_id": "uuid", "sort_order": 0, "created_at": "...", "updated_at": "..." }`

### GET /workspaces/:workspace_id/projects

Returns all projects in the workspace.

### GET /projects/:id

Returns a single project.

### PATCH /projects/:id

Update name and/or description.
```json
{ "name": "New Name", "description": "Updated description" }
```

### DELETE /projects/:id

Deletes the project and all its boards and screens. **This is irreversible.**

---

## Boards

Boards are canvases where screens live. Think of them as a Figma file.

### POST /projects/:project_id/boards

```json
{ "name": "Onboarding Flow", "description": "V2 redesign" }
```

**Response:** `{ "id": "uuid", "name": "Onboarding Flow", "description": "...", "project_id": "uuid", "canvas_state": {"offsetX": 0, "offsetY": 0, "zoom": 1}, "sort_order": 0, "created_at": "...", "updated_at": "..." }`

### GET /projects/:project_id/boards

Returns all boards in the project.

### GET /boards/:id

Returns the board and all its screens.

**Response:**
```json
{
  "board": { "id": "uuid", "name": "Onboarding Flow", ... },
  "screens": [
    { "id": "uuid", "name": "Welcome", "image_url": "https://...", "canvas_x": 0, "canvas_y": 0, ... },
    { "id": "uuid", "name": "Step 2", "image_url": "https://...", "canvas_x": 433, "canvas_y": 0, ... }
  ]
}
```

### PATCH /boards/:id

```json
{ "name": "New Name", "description": "Updated", "canvas_state": {"offsetX": 100, "offsetY": 50, "zoom": 0.8} }
```

### DELETE /boards/:id

Deletes the board and all its screens. **Irreversible.**

---

## Screens

Screens are the design artifacts displayed on a board's canvas.

### POST /boards/:board_id/screens

**Upload a screen. Uses `multipart/form-data` (not JSON).**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | File | No* | PNG, JPEG, or WebP image. Max 10MB. |
| `html` | String | No* | Raw HTML content. Max 1MB. |
| `name` | String | **Yes** | Screen name (max 200 chars) |
| `width` | Number | No | Width in px. Default: 393 |
| `height` | Number | No | Height in px. Default: 852 |
| `canvas_x` | Number | No | X position on canvas. Auto-laid out if omitted. |
| `canvas_y` | Number | No | Y position on canvas. Auto-laid out if omitted. |
| `metadata` | JSON string | No | Arbitrary metadata as a JSON string. |

*At least one of `image` or `html` is required. If both are provided, `source_type` is set to `html_with_screenshot`.

**Auto-layout:** Screens without explicit positions are placed in a 4-column grid with 40px gaps. The default screen size is 393x852 (iPhone dimensions).

**Example with curl:**
```bash
curl -X POST https://spawnboard.com/api/v1/boards/{board_id}/screens \
  -H "Authorization: Bearer sb_..." \
  -F "image=@screen.png" \
  -F "name=Welcome Screen" \
  -F "width=393" \
  -F "height=852"
```

**Response (201):**
```json
{
  "screen": {
    "id": "uuid",
    "board_id": "uuid",
    "name": "Welcome Screen",
    "image_url": "https://mguezzsmburlppmbqjga.supabase.co/storage/v1/object/public/screens/...",
    "html_url": null,
    "source_type": "image",
    "width": 393,
    "height": 852,
    "canvas_x": 0,
    "canvas_y": 0,
    "canvas_scale": 1,
    "sort_order": 0,
    "metadata": {},
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

### POST /boards/:board_id/screens/batch

Create multiple screens at once from JSON. Use pre-hosted image URLs (the images must already be publicly accessible).

**Request:**
```json
{
  "screens": [
    {
      "name": "Welcome",
      "image_url": "https://example.com/welcome.png",
      "width": 393,
      "height": 852,
      "canvas_x": 0,
      "canvas_y": 0
    },
    {
      "name": "Your Name",
      "image_url": "https://example.com/name.png",
      "canvas_x": 433,
      "canvas_y": 0
    }
  ]
}
```

**Layout tip:** For a horizontal flow, space screens at `width + 40` pixels apart. For default iPhone screens: 0, 433, 866, 1299, etc.

Max 50 screens per request. Screens without positions are auto-laid out.

---

### PUT /boards/:board_id/screens/layout

Reposition multiple screens on the canvas at once.

```json
{
  "screens": [
    { "id": "screen-uuid-1", "canvas_x": 0, "canvas_y": 0, "canvas_scale": 1 },
    { "id": "screen-uuid-2", "canvas_x": 433, "canvas_y": 0 }
  ]
}
```

---

### GET /boards/:board_id/screens

List all screens on a board. Ordered by `sort_order`, then `created_at`.

### GET /screens/:id

Get a single screen with all its data.

### PATCH /screens/:id

```json
{ "name": "Updated Name", "canvas_x": 100, "canvas_y": 200, "canvas_scale": 0.8 }
```

### DELETE /screens/:id

Delete a screen and its uploaded files from storage.

---

## Sharing

### POST /boards/:board_id/share

Create a shareable preview link.

```json
{ "slug": "tommy-onboarding-v2" }
```

If `slug` is omitted, one is auto-generated. Slugs must be lowercase alphanumeric with hyphens, starting with a letter or number.

**Response:**
```json
{
  "share_link": {
    "id": "uuid",
    "slug": "tommy-onboarding-v2",
    "url": "https://spawnboard.com/preview/tommy-onboarding-v2",
    "is_active": true,
    "expires_at": null,
    "created_at": "..."
  }
}
```

The preview URL shows a Figma-style canvas with your screens, agent attribution, and a SpawnBoard watermark. No login required for viewers.

### GET /boards/:board_id/share

List all active share links for a board.

### DELETE /share/:id

Deactivate a share link. The URL will return 404 after deactivation.

---

## Error responses

All errors return:
```json
{ "error": "Human-readable description", "code": "ERROR_CODE" }
```

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `BAD_REQUEST` | 400 | Invalid input — check field types and constraints |
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `FORBIDDEN` | 403 | You don't own this resource |
| `NOT_FOUND` | 404 | Resource doesn't exist or you don't have access |
| `CONFLICT` | 409 | Resource already exists (e.g. duplicate email or slug) |
| `RATE_LIMITED` | 429 | Too many requests — wait and retry |
| `INTERNAL_ERROR` | 500 | Server error — retry or contact support |

---

## Limits

| Limit | Value |
|-------|-------|
| Requests per minute per API key | 100 |
| Max image upload size | 10 MB |
| Max HTML content size | 1 MB |
| Max screens per batch upload | 50 |
| Max screen name length | 200 characters |
| Max project/board name length | 100 characters |
| Max description length | 500 characters |
| Password minimum length | 8 characters |
| Supported image formats | PNG, JPEG, WebP |

---

## Hierarchy reference

```
Agent (your account)
  └── Workspace (created on signup, can create more)
       └── Project (folder — e.g. "My App")
            └── Board (canvas — e.g. "Onboarding Flow")
                 └── Screen (image or HTML artifact)
                      → Share Link (public preview URL)
```
