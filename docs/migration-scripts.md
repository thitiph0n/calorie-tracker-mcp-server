# Production Migration Scripts

This document explains the new database migration scripts and tools added to help manage your Cloudflare D1 production database.

## Available Scripts

### Core Migration Scripts

| Script | Description |
|--------|-------------|
| `npm run migrate:prod` | Apply all pending migrations to production |
| `npm run migrate:prod:status` | Check migration status in production |
| `npm run migrate:prod:manual` | Interactive migration with safety checks |
| `npm run migrate:prod:verify` | Verify recent migrations were applied |

### Database Utility Scripts

| Script | Description |
|--------|-------------|
| `npm run db:utils` | Show help for database utility commands |
| `npm run db:status` | Check migration status (development) |
| `npm run db:status:prod` | Check migration status (production) |
| `npm run db:tables` | List all tables (development) |
| `npm run db:users` | List all users (development) |
| `npm run db:reset:dev` | Reset development database |

### Backup Scripts

| Script | Description |
|--------|-------------|
| `npm run db:prod:backup` | Create full backup of production database |

## Quick Start

### 1. Apply Production Migrations

The simplest way to apply migrations:

```bash
npm run migrate:prod
```

### 2. Interactive Migration (Recommended)

For safety, use the interactive migration script:

```bash
CONFIRM_PROD_MIGRATION=yes npm run migrate:prod:manual
```

This script will:

- ✅ Check prerequisites (wrangler, config, database access)
- ✅ Show current migration status
- ✅ Apply pending migrations
- ✅ Verify results
- ✅ Provide next steps

### 3. Check Migration Status

Before and after migrations:

```bash
npm run migrate:prod:status
```

### 4. Verify Database State

Check recent migrations:

```bash
npm run migrate:prod:verify
```

## Safety Features

### Production Confirmations

All production operations require explicit confirmation:

```bash
# For interactive migration
CONFIRM_PROD_MIGRATION=yes npm run migrate:prod:manual

# For utility operations
CONFIRM_PROD_OPERATION=yes npm run db:status:prod
```

### Backup Before Migration

Always backup before major changes:

```bash
npm run db:prod:backup
npm run migrate:prod
```

### Prerequisites Check

The migration scripts automatically verify:

- Wrangler CLI is installed and authenticated
- Production config file exists and is valid
- Database ID is configured
- Database is accessible

## Database Utilities

### Query Production Database

Execute custom queries:

```bash
# Using wrangler directly
npm run db:prod:query -- --command="SELECT COUNT(*) FROM users;"

# Using utility script (with confirmation)
CONFIRM_PROD_OPERATION=yes node scripts/db-utils.js query prod "SELECT COUNT(*) FROM users"
```

### List Tables and Users

```bash
# Development
npm run db:tables
npm run db:users

# Production (with confirmation)
CONFIRM_PROD_OPERATION=yes node scripts/db-utils.js tables prod
CONFIRM_PROD_OPERATION=yes node scripts/db-utils.js users prod
```

### Reset Development Database

For development only:

```bash
CONFIRM_DEV_RESET=yes npm run db:reset:dev
```

## Backup and Recovery

### Create Backup

```bash
npm run db:prod:backup
```

This creates:

- `backups/schema_TIMESTAMP.sql` - Database schema
- `backups/TABLE_TIMESTAMP.sql` - Data exports for each table
- `backups/migrations_TIMESTAMP.txt` - Migration status
- `backups/restore_TIMESTAMP.sh` - Restore script template

### Backup Strategy

Recommended backup schedule:

- Before any production migration
- Weekly automated backups
- Before major application deployments

## Troubleshooting

### Migration Fails

1. Check migration status:

   ```bash
   npm run migrate:prod:status
   ```

2. Verify database connectivity:

   ```bash
   wrangler d1 execute calorie-tracker --remote --config wrangler.production.jsonc --command="SELECT 1;"
   ```

3. Check migration file syntax:

   ```bash
   # Test migration locally first
   npm run db:status
   npm run migrate
   ```

### Database Connection Issues

1. Verify wrangler authentication:

   ```bash
   wrangler whoami
   ```

2. Check database ID in config:

   ```bash
   cat wrangler.production.jsonc | grep database_id
   ```

3. Test database access:

   ```bash
   wrangler d1 info calorie-tracker --config wrangler.production.jsonc
   ```

### Admin User Issues

After migration, verify admin user exists:

```bash
CONFIRM_PROD_OPERATION=yes node scripts/db-utils.js query prod "SELECT id, name, email, role FROM users WHERE role = 'admin';"
```

## Best Practices

### 1. Always Backup First

```bash
npm run db:prod:backup
npm run migrate:prod
```

### 2. Test Locally

```bash
# Test migration in development
npm run migrate
npm run test

# Then apply to production
npm run migrate:prod
```

### 3. Verify After Migration

```bash
npm run migrate:prod:verify
npm run deploy:prod
```

### 4. Monitor Application

After migration:

- Check application logs: `wrangler tail`
- Test authentication with admin API key
- Verify tools work through MCP client

## Development Workflow

### Adding New Migrations

1. Create migration file: `migrations/0004_new_feature.sql`
2. Test locally:

   ```bash
   npm run migrate
   npm run test
   ```

3. Apply to production:

   ```bash
   npm run db:prod:backup
   npm run migrate:prod
   npm run deploy:prod
   ```

### Database Schema Changes

1. Always backup production first
2. Test schema changes locally
3. Consider backwards compatibility
4. Plan rollback strategy if needed

## File Structure

```
scripts/
├── migrate-prod.js     # Interactive production migration
├── backup-prod.js      # Production backup utility
└── db-utils.js         # General database utilities

backups/                # Created by backup script
├── schema_*.sql
├── *_table_*.sql
├── migrations_*.txt
└── restore_*.sh
```

## Security Notes

- Production operations require explicit confirmation
- API keys are never logged or displayed
- Backup files may contain sensitive data
- Always use secure connections for production access

## Support

If you encounter issues:

1. Check this documentation
2. Review script output for specific error messages  
3. Verify prerequisites and configuration
4. Test operations in development first
5. Check Cloudflare Workers dashboard for service status
