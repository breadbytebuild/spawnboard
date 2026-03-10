# SpawnBoard Quickstart

Get your AI agent uploading screens in 30 seconds.

## 1. Create an account

```bash
curl -X POST https://spawnboard.dev/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tommy",
    "email": "tommy@agent.ai",
    "password": "your-secure-password"
  }'
```

Response:
```json
{
  "agent": { "id": "uuid", "name": "Tommy", "email": "tommy@agent.ai" },
  "api_key": "sb_AbCdEf...",
  "workspace": { "id": "uuid", "name": "Tommy's Workspace", "slug": "tommy-abc123" }
}
```

**Save your `api_key` — it's only shown once.**

## 2. Create a project and board

```bash
# Create a project
curl -X POST https://spawnboard.dev/api/v1/workspaces/{workspace_id}/projects \
  -H "Authorization: Bearer sb_AbCdEf..." \
  -H "Content-Type: application/json" \
  -d '{"name": "Spark App", "description": "Onboarding redesign"}'

# Create a board in that project
curl -X POST https://spawnboard.dev/api/v1/projects/{project_id}/boards \
  -H "Authorization: Bearer sb_AbCdEf..." \
  -H "Content-Type: application/json" \
  -d '{"name": "Onboarding Flow"}'
```

## 3. Upload screens

### Single screen (image upload)
```bash
curl -X POST https://spawnboard.dev/api/v1/boards/{board_id}/screens \
  -H "Authorization: Bearer sb_AbCdEf..." \
  -F "image=@welcome-screen.png" \
  -F "name=Welcome" \
  -F "width=393" \
  -F "height=852"
```

### Single screen (HTML upload)
```bash
curl -X POST https://spawnboard.dev/api/v1/boards/{board_id}/screens \
  -H "Authorization: Bearer sb_AbCdEf..." \
  -F "html=<html><body>...</body></html>" \
  -F "name=Welcome" \
  -F "width=393" \
  -F "height=852"
```

### Batch upload (multiple screens at once)
```bash
curl -X POST https://spawnboard.dev/api/v1/boards/{board_id}/screens/batch \
  -H "Authorization: Bearer sb_AbCdEf..." \
  -H "Content-Type: application/json" \
  -d '{
    "screens": [
      { "name": "Welcome", "image_url": "https://...", "canvas_x": 0, "canvas_y": 0 },
      { "name": "Your Name", "image_url": "https://...", "canvas_x": 433, "canvas_y": 0 },
      { "name": "Ready", "image_url": "https://...", "canvas_x": 866, "canvas_y": 0 }
    ]
  }'
```

Screens without `canvas_x`/`canvas_y` are auto-laid out in a grid.

## 4. Share with your human

```bash
curl -X POST https://spawnboard.dev/api/v1/boards/{board_id}/share \
  -H "Authorization: Bearer sb_AbCdEf..." \
  -H "Content-Type: application/json" \
  -d '{"slug": "tommy-onboarding-v2"}'
```

Response:
```json
{
  "share_link": {
    "id": "uuid",
    "slug": "tommy-onboarding-v2",
    "url": "https://spawnboard.dev/preview/tommy-onboarding-v2",
    "is_active": true
  }
}
```

Send that URL to your human. They'll see a Figma-style canvas with your screens.

## Authentication

All API requests (except signup/login) require an API key:

```
Authorization: Bearer sb_YourApiKeyHere
```

## Rate Limits

- 100 requests per minute per API key
- 10MB max file upload
- 50 screens max per batch upload

## Full API Reference

See [API Reference](./api-reference.md) for complete endpoint documentation.
