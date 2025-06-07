# Deployment Guide - Calorie Tracker MCP Server

## Prerequisites

1. **Cloudflare Account**: Ensure you have a Cloudflare account with Workers and D1 database access
2. **Wrangler CLI**: Make sure you're logged in to Wrangler

   ```bash
   wrangler whoami
   # If not logged in:
   wrangler login
   ```

## Step 1: Create Production Database

1. Create a D1 database for production:

   ```bash
   wrangler d1 create calorie-tracker-production
   ```

2. Copy the database ID from the output (it will look like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

## Step 2: Configure Production Environment

1. **Copy the production config template**:

   ```bash
   cp wrangler.production.jsonc wrangler.production.local.jsonc
   ```

2. **Edit `wrangler.production.local.jsonc`** and replace `YOUR_ACTUAL_PRODUCTION_DATABASE_ID_HERE` with your actual database ID

3. **Run database migrations** on your production database:

   ```bash
   # Apply initial migration
   wrangler d1 execute calorie-tracker-production --file=migrations/0001_initial.sql --config=wrangler.production.local.jsonc
   
   # Apply role-based auth migration
   wrangler d1 execute calorie-tracker-production --file=migrations/0002_role_based_auth.sql --config=wrangler.production.local.jsonc
   ```

## Step 3: Set Up Secrets

Set up your production secrets using Wrangler:

```bash
# Set admin API key (generate a strong random key)
wrangler secret put ADMIN_API_KEY --config=wrangler.production.local.jsonc

# If you have other secrets, add them here
```

## Step 4: Deploy

Deploy to production using the production configuration:

```bash
# Deploy to production
pnpm run deploy:prod
# or
wrangler deploy --config wrangler.production.local.jsonc
```

## Step 5: Verify Deployment

1. Check that your worker is running:

   ```bash
   wrangler tail --config=wrangler.production.local.jsonc
   ```

2. Test the deployment by making a request to your worker URL

## Security Best Practices

### ✅ Do

- Keep `wrangler.production.local.jsonc` in your `.gitignore`
- Use strong, randomly generated API keys
- Use Wrangler secrets for sensitive data
- Use different database IDs for development and production
- Regularly rotate your API keys

### ❌ Don't

- Commit production configurations to Git
- Use the same database for development and production
- Share API keys in plain text
- Use weak or predictable API keys

## Alternative Deployment Methods

### Option 1: Using Environment Variables

Instead of separate config files, you can use environment variables:

```bash
# Set environment variables
export DATABASE_ID="your-production-database-id"
export WORKER_NAME="calorie-tracker-mcp-server-prod"

# Deploy with environment override
wrangler deploy --var DATABASE_ID:$DATABASE_ID --name $WORKER_NAME
```

### Option 2: Using Wrangler TOML (Legacy)

If you prefer TOML format, create a `wrangler.toml` file (but remember to gitignore it if it contains credentials).

### Option 3: CI/CD Pipeline

For automated deployments, set up GitHub Actions or similar CI/CD:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Troubleshooting

### Database Connection Issues

- Verify your database ID is correct
- Ensure migrations have been applied
- Check that the database exists in your Cloudflare dashboard

### Authentication Issues

- Verify secrets are set correctly: `wrangler secret list`
- Check API key format and permissions
- Ensure you're using the right configuration file

### Deployment Failures

- Check wrangler version: `wrangler --version`
- Verify syntax in configuration files
- Check Cloudflare dashboard for any service issues
