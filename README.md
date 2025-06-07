# Calorie Tracker MCP Server

A Model Context Protocol (MCP) server for tracking daily calorie intake, built on Cloudflare Workers with D1 database and role-based authentication.

## Features

- **Role-Based Authentication**: Admin and user roles with proper access control
- **Calorie Tracking**: Add, update, delete, and list food entries
- **User Management**: Admin tools for registering users and revoking API keys
- **Database-Driven**: Uses Cloudflare D1 for secure data storage
- **MCP Compatible**: Works with Claude Desktop and other MCP clients

## Quick Setup

### 1. Deploy and Configure

```bash
# Clone and install dependencies
npm install

# Apply database migrations (creates tables and admin user)
npx wrangler d1 migrations apply prod-calorie-tracker --local

# Start development server
npm run dev
```

### 2. Admin User

The migration automatically creates an admin user:

- **Email**: `admin@calorie-tracker.com`
- **API Key**: `admin-api-key-2025`
- **Role**: `admin`

### 3. Connect to Claude Desktop

Update your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "calorie-tracker": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8787/sse"],
      "env": {
        "BEARER_TOKEN": "admin-api-key-2025"
      }
    }
  }
}
```

## Available Tools

### User Tools (All authenticated users)

- `list_entries` - List daily food entries with date filtering
- `add_entry` - Add new food entries with nutritional data
- `update_entry` - Update existing food entries
- `delete_entry` - Delete food entries

### Admin Tools (Admin role only)

- `register_user` - Register new users with unique API keys
- `revoke_user` - Revoke user API keys by ID or email

## Database Schema

### Users Table

- `id` - Primary key
- `name` - User's display name
- `email` - Unique email address
- `api_key_hash` - SHA-256 hashed API key
- `role` - Either 'user' or 'admin'
- `created_at` - Account creation timestamp

### Food Entries Table

- `id` - Primary key
- `user_id` - Foreign key to users table
- `food_name` - Name of the food item
- `calories` - Calorie count
- `protein_g`, `carbs_g`, `fat_g` - Macronutrients
- `meal_type` - breakfast, lunch, dinner, or snack
- `entry_date` - Date of the meal
- `created_at`, `updated_at` - Timestamps
