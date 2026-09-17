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

## migration process
- cd backend
- npm.cmd run migrate:create -- 'migration-name'
- new migration file should appear: 
database/migrations/
└── 123456789_add-order-notes.sql

- in the sql file you can make the change for the migration:
-- Up Migration

ALTER TABLE orders
ADD COLUMN customer_notes VARCHAR(500);

-- Down Migration

ALTER TABLE orders
DROP COLUMN customer_notes;

-- then push to your branch and make pr and merge it to the main branch

-- github action will be triggered automatically

-- in neon you can check