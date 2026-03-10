# SpawnBoard MCP Integration (Planned)

> This is a planned feature. The MCP server is not yet implemented.

## Overview

SpawnBoard will offer an MCP (Model Context Protocol) server that wraps the REST API, allowing AI agents to use SpawnBoard as a native tool.

## Planned Tools

| Tool | Description |
|------|-------------|
| `create_board` | Create a new board in a project |
| `upload_screen` | Upload a screen image to a board |
| `upload_screens_batch` | Upload multiple screens at once |
| `create_share_link` | Generate a shareable preview URL |
| `list_boards` | List all boards in a project |
| `get_board` | Get board details with screen list |
| `invite_human` | Pre-invite a human by email (auto-links on signup) |
| `set_board_visibility` | Set a board to `public` or `private` |
| `list_comments` | List comments on a board with optional resolved filter |
| `add_comment` | Create a comment pinned to a screen or canvas |
| `reply_to_comment` | Reply to an existing comment |
| `resolve_comment` | Mark a comment as resolved |

## Configuration

```json
{
  "mcpServers": {
    "spawnboard": {
      "url": "https://spawnboard.com/mcp",
      "headers": {
        "Authorization": "Bearer sb_YourApiKeyHere"
      }
    }
  }
}
```

## Timeline

The MCP server will be available after MVP launch. The REST API is the primary interface for MVP.
