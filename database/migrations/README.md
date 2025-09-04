# Database Migrations

This directory contains incremental database schema changes for the payment-agent project. Each migration file represents a specific change that can be applied to evolve the database schema over time.

## Migration Files

| File | Description | Date |
|------|-------------|------|
| `001_add_user_roles_and_merchant_status.sql` | Adds user roles and merchant status to pg_profiles | 2025-01-04 |
| `002_create_subscription_system.sql` | Creates subscription plans and user subscriptions tables | 2025-01-04 |
| `003_update_transactions_for_marketplace.sql` | Updates transactions table for marketplace functionality | 2025-01-04 |
| `004_create_merchant_onboarding_logs.sql` | Creates merchant onboarding logs table | 2025-01-04 |

## How to Apply Migrations

### For New Databases
1. Apply the base schema first: `database/schema.sql`
2. Apply migrations in order: `001`, `002`, `003`, `004`

### For Existing Databases
Apply only the migrations that haven't been run yet, in numerical order.

### Using Supabase CLI
```bash
# Apply a specific migration
supabase db reset --db-url "your-database-url"

# Or apply via SQL editor in Supabase Dashboard
# Copy and paste each migration file content
```

### Using psql
```bash
# Apply migrations in order
psql -h your-host -d your-database -f database/migrations/001_add_user_roles_and_merchant_status.sql
psql -h your-host -d your-database -f database/migrations/002_create_subscription_system.sql
psql -h your-host -d your-database -f database/migrations/003_update_transactions_for_marketplace.sql
psql -h your-host -d your-database -f database/migrations/004_create_merchant_onboarding_logs.sql
```

## Migration Tracking

Consider implementing a migration tracking table to keep track of applied migrations:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Best Practices

1. **Never modify existing migration files** - Create new migrations instead
2. **Test migrations on a copy** of production data before applying
3. **Backup your database** before applying migrations
4. **Apply migrations in order** - dependencies matter
5. **Keep migrations small and focused** - one logical change per migration

## Rollback Strategy

Each migration should be designed to be reversible. Consider creating corresponding rollback scripts if needed:
- `001_add_user_roles_and_merchant_status_rollback.sql`
- etc.

## Current Schema State

After applying all migrations, your database will have:
- **pg_profiles**: Extended with user roles, merchant status, and subscription info
- **pg_payment_methods**: Unchanged from base schema
- **pg_transactions**: Extended with marketplace buyer/seller support
- **pg_subscription_plans**: New table for merchant subscription plans
- **pg_user_subscriptions**: New table for user subscription tracking
- **pg_merchant_onboarding_logs**: New table for onboarding event tracking
