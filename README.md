# Grocery Link Helper
Grocery Link Helper is a web-based platform that connects customers with local fulfillment helpers. Customers submit store-specific grocery orders, confirm payment upfront, and track delivery status until the order arrives.

## Directory Structure
- `/frontend`: React web application
- `/backend`: Express API backend
- `/database/migrations`: PostgreSQL DDL scripts and migrations
- `/docs`: System Design Specification (SDS) artifacts and documentation

## Branching Strategy
- `main`: Locked release branch (production-ready)
- `develop`: Primary integration branch
- `feature/us-XX-short-description`: Feature branches for user stories
- `bugfix/issue-description`: Bug resolution branches

## Quick Start
This section will include setup instructions, `.env` configuration steps, and how to start the local server.

## Database Migration Process

Database changes must be added as new migration files. Do not edit a migration that has already been applied.

### 1. Update Your Local Main Branch

From the project root:

```powershell
git switch main
git pull origin main
git switch -c feature/your-database-change
```

Replace `your-database-change` with a descriptive branch name.

Example:

```powershell
git switch -c feature/add-order-notes
```

### 2. Create a Migration

Move into the backend directory:

```powershell
cd backend
```

Create a migration with a descriptive name:

```powershell
npm.cmd run migrate:create -- migration-name
```

Example:

```powershell
npm.cmd run migrate:create -- add-order-notes
```

A timestamped migration file will appear in:

```text
database/migrations/
└── 123456789_add-order-notes.sql
```

### 3. Define the Database Change

Open the generated SQL file and add an `Up Migration` and a `Down Migration`.

Example:

```sql
-- Up Migration

ALTER TABLE orders
ADD COLUMN customer_notes VARCHAR(500);

-- Down Migration

ALTER TABLE orders
DROP COLUMN customer_notes;
```

The `Up Migration` applies the database change.

The `Down Migration` reverses the database change.

### 4. Test the Migration Locally

Temporarily set the connection to your local PostgreSQL database:

```powershell
$env:DATABASE_URL="postgresql://grocery_app:YOUR_LOCAL_PASSWORD@localhost:5432/grocery_db"
```

Apply all pending migrations:

```powershell
npm.cmd run migrate:up
```

After testing, remove the temporary environment variable:

```powershell
Remove-Item Env:DATABASE_URL
```

Verify the change in your local pgAdmin database before continuing.

### 5. Commit and Push the Migration

Return to the project root:

```powershell
cd ..
```

Check the changed files:

```powershell
git status
```

Stage and commit the migration:

```powershell
git add database/migrations
git commit -m "Add migration-name migration"
```

Push the feature branch:

```powershell
git push -u origin feature/your-database-change
```

Example:

```powershell
git push -u origin feature/add-order-notes
```

### 6. Create a Pull Request

Create a pull request from the feature branch into `main`.

```text
feature/your-database-change → main
```

After the pull request is reviewed and merged, GitHub Actions automatically applies all pending migrations to the Neon database.

### 7. Verify the Migration

Open the repository's **Actions** tab and confirm that the **Apply Neon database migrations** workflow completed successfully.

The migration history can also be checked in the Neon SQL Editor:

```sql
SELECT *
FROM pgmigrations
ORDER BY run_on DESC;
```

Verify the actual schema change in Neon before starting another database migration.

### Important Rules

- Never edit a migration that has already been applied.
- Create a new migration for every database change.
- Test migrations against your local PostgreSQL database first.
- Never commit a local or Neon database connection string.
- Never commit `.env` files.
- Only merge database migrations after reviewing the SQL.