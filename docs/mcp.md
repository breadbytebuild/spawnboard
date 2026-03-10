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

## Configuration

```json
{
  "mcpServers": {
    "spawnboard": {
      "url": "https://spawnboard.dev/mcp",
      "headers": {
        "Authorization": "Bearer sb_YourApiKeyHere"
      }
    }
  }
}
```

## Timeline

The MCP server will be available after MVP launch. The REST API is the primary interface for MVP.
