# Calorie Tracker MCP Server - Implementation Plan

## Project Status: Database Integration Phase Complete ✅

This implementation plan tracks the development of a calorie tracking MCP server with Bearer token authentication.

## Recent Improvements Completed ✅

### 1. Database-Driven Authentication ✅

- ✅ Updated authentication middleware to query D1 database for user validation
- ✅ Added fallback to environment variables for backwards compatibility
- ✅ Implemented proper error handling for database authentication failures

### 2. Admin API Key Support ✅

- ✅ Added `ADMIN_API_KEY` environment variable support
- ✅ Updated authentication middleware to detect admin users
- ✅ Created admin-only `register_user` tool for user management
- ✅ Updated wrangler.jsonc with development admin API key

### 3. Code Organization - Tools Directory ✅

- ✅ Created `/src/tools/` directory structure
- ✅ Separated tool logic into individual files:
  - `base.ts` - Common interfaces and helper functions
  - `list-entries.ts` - List food entries with database queries
  - `add-entry.ts` - Add new food entries with database insertion
  - `update-entry.ts` - Update existing entries with ownership checks
  - `delete-entry.ts` - Delete entries with ownership validation
  - `register-user.ts` - Admin-only user registration tool
  - `index.ts` - Export all tools for easy importing
- ✅ Updated main index.ts to use organized tool structure
- ✅ Implemented proper TypeScript typing throughout

## 1. Database Schema (D1 SQLite)

```sql
-- Users table for API key authentication
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Food entries table
CREATE TABLE food_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  food_name TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein_g REAL,
  carbs_g REAL,
  fat_g REAL,
  meal_type TEXT CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for better query performance
CREATE INDEX idx_food_entries_user_date ON food_entries(user_id, entry_date);
CREATE INDEX idx_food_entries_created_at ON food_entries(created_at);
```

## 2. API Authentication ✅ COMPLETED

### Middleware for API Key Validation

- ✅ Validate API keys from `Authorization: Bearer <api_key>` header
- ✅ Store valid API keys in environment variables
- ✅ Created `withAuth` middleware in `/src/auth/middleware.ts`
- ✅ Integrated with MCP agent using static user ID management
- 🔄 For production: Use Cloudflare secrets instead of environment variables

## 3. MCP Tools Implementation ✅ STRUCTURE COMPLETE

### 3.1 User Management Tools

#### 3.1.1 List Daily Entries ✅ IMPLEMENTED

```typescript
// ✅ Implemented in src/index.ts with authentication
this.server.tool(
  'list_entries',
  {
    date: z.string().optional(), // ISO date string
    limit: z.number().int().positive().max(100).optional().default(10),
    offset: z.number().int().nonnegative().optional().default(0),
  },
  async ({ date, limit, offset }) => {
    // ✅ Authentication check implemented
    // 🔄 TODO: Connect to D1 database (currently using mock data)
  }
);
```

#### 3.1.2 Add Food Entry ✅ IMPLEMENTED

```typescript
// ✅ Implemented in src/index.ts with authentication
this.server.tool(
  'add_entry',
  {
    food_name: z.string().min(1).max(255),
    calories: z.number().int().positive(),
    protein_g: z.number().positive().optional(),
    carbs_g: z.number().positive().optional(),
    fat_g: z.number().positive().optional(),
    meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
    entry_date: z.string().optional(), // ISO date string
  },
  async (entryData) => {
    // ✅ Authentication check implemented
    // 🔄 TODO: Connect to D1 database (currently using mock response)
  }
);
```

#### 3.1.3 Update Food Entry ✅ IMPLEMENTED

```typescript
// ✅ Implemented in src/index.ts with authentication
this.server.tool(
  'update_entry',
  {
    entry_id: z.string().uuid(),
    food_name: z.string().min(1).max(255).optional(),
    calories: z.number().int().positive().optional(),
    protein_g: z.number().positive().optional(),
    carbs_g: z.number().positive().optional(),
    fat_g: z.number().positive().optional(),
    meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  },
  async (updateData) => {
    // ✅ Authentication check implemented
    // 🔄 TODO: Connect to D1 database (currently using mock response)
  }
);
```

#### 3.1.4 Delete Food Entry ✅ IMPLEMENTED

```typescript
// ✅ Implemented in src/index.ts with authentication
this.server.tool(
  'delete_entry',
  {
    entry_id: z.string().uuid(),
  },
  async ({ entry_id }) => {
    // ✅ Authentication check implemented
    // 🔄 TODO: Connect to D1 database (currently using mock response)
  }
);
```

### 3.0 Admin Tools

#### 3.0.1 Register New User (Admin Only) - NOT NEEDED

**Note**: Simplified to single-user authentication for this implementation.

## 4. Project Structure ✅ COMPLETED

```plain
src/
├── index.ts              # ✅ Main entry point with MCP agent
├── auth/
│   └── middleware.ts     # ✅ Authentication middleware
├── types/                # (ready for type definitions)
└── utils/                # (ready for utility functions)

docs/
└── implementation-plan.md # ✅ This implementation plan

migrations/
└── 0001_initial.sql      # ✅ Database schema

worker-configuration.d.ts  # ✅ Updated with API_KEY type
wrangler.jsonc             # ✅ Updated with dev API key and D1 config
package.json               # ✅ Dependencies and scripts
```

**Note**: Simplified from original plan - removed separate model and tool files for single-file simplicity.

## 5. Implementation Steps

### Phase 1: Authentication ✅ COMPLETED

1. ✅ **Setup Project**

   - ✅ Initialize D1 database
   - ✅ Set up Wrangler configuration
   - ✅ Create database migration scripts

2. ✅ **Authentication**
   - ✅ Implement API key generation and validation
   - ✅ Create middleware to protect routes
   - ✅ Integrate with MCP agent pattern

### Phase 2: Database Integration ✅ COMPLETED

1. **Database Layer** ✅

   - ✅ Connected to D1 database in all tool handlers
   - ✅ Replaced mock data with actual database queries
   - ✅ Added comprehensive error handling for database operations
   - ✅ Implemented proper ownership checks for user data

2. **Authentication Enhancement** ✅

   - ✅ Database-driven user authentication via API keys
   - ✅ Admin API key support for administrative operations
   - ✅ Backward compatibility with environment variable authentication

3. **Code Organization** ✅
   - ✅ Modular tool structure in `/src/tools/` directory
   - ✅ Proper TypeScript interfaces and type safety
   - ✅ Consistent error handling and response patterns

### Phase 3: Testing & Deployment 📋 PENDING

1. **MCP Tools**

   - 📋 Test each tool with real database
   - 📋 Add comprehensive error handling and logging
   - 📋 Validate data integrity and constraints

2. **Testing**

   - 📋 Unit tests for each tool
   - 📋 Integration tests for the full flow
   - 📋 Load testing for performance

3. **Deployment**
   - 📋 Set up CI/CD pipeline
   - 📋 Configure production environment variables
   - 📋 Set up monitoring and logging

## 6. Cost Optimization

1. **D1 Database**

   - Free tier: 5MB storage, 5M reads/day, 100K writes/day
   - Perfect for this use case

2. **Workers**

   - Free tier: 100K requests/day
   - More than enough for personal use

3. **KV**
   - Free tier: 1GB storage, 100K reads/day
   - Can be used for caching frequent queries

## 7. Next Steps - Current Priority

### Testing & Deployment Phase 📋 PENDING

1. **Database Setup**

   - 📋 Run database migrations on production D1 instance
   - 📋 Create initial admin user in database
   - 📋 Test database connection and queries

2. **Authentication Testing**

   - 📋 Test user registration flow with admin API key
   - 📋 Test database-driven authentication
   - 📋 Verify admin vs regular user access controls

3. **MCP Tools Testing**

   - 📋 Test all CRUD operations with real database
   - 📋 Verify data integrity and ownership checks
   - 📋 Test error handling scenarios

4. **Production Deployment**
   - 📋 Set production secrets for API_KEY and ADMIN_API_KEY
   - 📋 Deploy to Cloudflare Workers
   - 📋 Configure production D1 database
   - 📋 Set up monitoring and logging

## 8. Available Tools

### User Tools (Requires valid API key)

1. **`list_entries`** - List food entries for a specific date with pagination
2. **`add_entry`** - Add new food entry with nutritional information
3. **`update_entry`** - Update existing food entry (ownership verified)
4. **`delete_entry`** - Delete food entry (ownership verified)

### Admin Tools (Requires admin API key)

5. **`register_user`** - Register new users with API key generation

## 9. Environment Variables

### Development (wrangler.jsonc)

```jsonc
"vars": {
  "API_KEY": "dev-api-key-12345",
  "ADMIN_API_KEY": "YOUR_ADMIN_API_KEY"
}
```

### Production (Cloudflare Secrets)

```bash
wrangler secret put API_KEY
wrangler secret put ADMIN_API_KEY
```

## 8. Development Commands

```bash
# Start development server
npm run dev
# or
wrangler dev

# Type checking
npm run type-check

# Deploy to production
npm run deploy
```
