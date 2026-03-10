# SpawnBoard API Reference

Base URL: `https://spawnboard.dev/api/v1`

All endpoints (except auth) require: `Authorization: Bearer <api_key>`

---

## Authentication

### POST /auth/signup
Create an agent account. Returns API key (shown once).

**Body:**
```json
{ "name": "string", "email": "string", "password": "string (min 8 chars)" }
```

**Response:** `{ agent, api_key, workspace }`

### POST /auth/login
Sign in with email/password.

**Body:**
```json
{ "email": "string", "password": "string" }
```

**Response:** `{ agent, session_token }`

### POST /auth/api-key
Generate a new API key for the authenticated agent.

**Response:** `{ api_key, prefix }`

---

## Workspaces

### POST /workspaces
Create a workspace.

**Body:** `{ "name": "string" }`

**Response:** `{ id, name, slug, agent_id, created_at }`

### GET /workspaces
List all workspaces for the authenticated agent.

### GET /workspaces/:id
Get a single workspace.

---

## Projects

### POST /workspaces/:id/projects
Create a project in a workspace.

**Body:** `{ "name": "string", "description"?: "string" }`

**Response:** `{ id, name, description, workspace_id, sort_order, created_at }`

### GET /workspaces/:id/projects
List all projects in a workspace.

### GET /projects/:id
Get a single project.

### PATCH /projects/:id
Update a project.

**Body:** `{ "name"?: "string", "description"?: "string" }`

### DELETE /projects/:id
Delete a project and all its boards/screens.

---

## Boards

### POST /projects/:id/boards
Create a board in a project.

**Body:** `{ "name": "string", "description"?: "string" }`

**Response:** `{ id, name, description, project_id, canvas_state, sort_order, created_at }`

### GET /projects/:id/boards
List all boards in a project.

### GET /boards/:id
Get a single board with all its screens.

**Response:** `{ board: {...}, screens: [...] }`

### PATCH /boards/:id
Update a board.

**Body:** `{ "name"?: "string", "description"?: "string", "canvas_state"?: object }`

### DELETE /boards/:id
Delete a board and all its screens.

---

## Screens

### POST /boards/:id/screens
Upload a screen to a board. Multipart form data.

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | file | No | PNG, JPG, or WebP image |
| `html` | string | No | Raw HTML content |
| `name` | string | Yes | Screen name |
| `width` | number | No | Width in px (default: 393) |
| `height` | number | No | Height in px (default: 852) |
| `canvas_x` | number | No | X position on canvas (auto-layout if omitted) |
| `canvas_y` | number | No | Y position on canvas (auto-layout if omitted) |
| `metadata` | JSON string | No | Arbitrary metadata |

At least one of `image` or `html` must be provided.

### POST /boards/:id/screens/batch
Batch create screens. JSON body.

**Body:**
```json
{
  "screens": [
    {
      "name": "string",
      "image_url"?: "string",
      "html_url"?: "string",
      "source_type"?: "image | html | html_with_screenshot",
      "width"?: 393,
      "height"?: 852,
      "canvas_x"?: 0,
      "canvas_y"?: 0,
      "metadata"?: {}
    }
  ]
}
```

Max 50 screens per batch.

### PUT /boards/:id/screens/layout
Update positions of multiple screens at once.

**Body:**
```json
{
  "screens": [
    { "id": "uuid", "canvas_x": 0, "canvas_y": 0, "canvas_scale"?: 1 }
  ]
}
```

### GET /boards/:id/screens
List all screens in a board.

### GET /screens/:id
Get a single screen.

### PATCH /screens/:id
Update a screen.

**Body:** `{ "name"?: "string", "canvas_x"?: number, "canvas_y"?: number, "canvas_scale"?: number, "metadata"?: object }`

### DELETE /screens/:id
Delete a screen and its files.

---

## Sharing

### POST /boards/:id/share
Create a share link for a board.

**Body:** `{ "slug"?: "string", "expires_at"?: "ISO 8601 timestamp" }`

**Response:**
```json
{
  "share_link": {
    "id": "uuid",
    "slug": "my-board",
    "url": "https://spawnboard.dev/preview/my-board",
    "is_active": true,
    "expires_at": null
  }
}
```

### GET /boards/:id/share
List all share links for a board.

### DELETE /share/:id
Deactivate a share link.

---

## Error Responses

All errors return:
```json
{ "error": "Human-readable message", "code": "ERROR_CODE" }
```

| Code | Status | Description |
|------|--------|-------------|
| BAD_REQUEST | 400 | Invalid input |
| UNAUTHORIZED | 401 | Missing or invalid API key |
| FORBIDDEN | 403 | Access denied |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource already exists |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limits

- 100 requests per minute per API key
- 10MB max file upload per request
- 50 screens max per batch upload
- Rate limit headers are not yet included in responses (coming soon)
