# Calorie Tracker MCP Server

MCP server for tracking daily calorie intake. Built on Cloudflare Workers with D1 database.

## Setup

```bash
pnpm install
npx wrangler d1 create YOUR_DATABASE_NAME
npx wrangler d1 migrations apply YOUR_DATABASE_NAME
pnpm run dev
```

Update `wrangler.jsonc` with your database ID.

## Configuration

Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "calorie-tracker": {
      "command": "npx", 
      "args": ["mcp-remote", "http://localhost:8787/sse"],
      "env": {
        "BEARER_TOKEN": "YOUR_ADMIN_API_KEY"
      }
    }
  }
}
```

## Tools

**Food Tracking Tools:**

- `list_entries` - List food entries
- `add_entry` - Add food entry  
- `update_entry` - Update entry
- `delete_entry` - Delete entry

**Profile Management Tools:**

- `get_profile` - Get user profile with BMR/TDEE calculations
- `update_profile` - Update profile data (height, age, gender, activity level, weight, muscle mass, body fat %)
- `get_profile_history` - Get historical profile tracking data

**Admin Tools:**

- `register_user` - Register new user
- `revoke_user` - Revoke user access
