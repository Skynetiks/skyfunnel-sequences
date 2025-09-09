# Database Setup

This directory contains the PostgreSQL database configuration and utilities for the sequences application using [postgres.js](https://github.com/porsager/postgres) - the fastest full-featured PostgreSQL client for Node.js, Deno, Bun and CloudFlare.

## Prerequisites

1. **PostgreSQL**: Make sure PostgreSQL is installed and running on your system
2. **Environment Variables**: Set up your `.env` file with the database connection string

## Environment Configuration

Create a `.env` file in the project root with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/sequences_db

# Environment
NODE_ENV=development

# Logging
LOG_LEVEL=info

# Feature Flags
ENABLE_METRICS=false
ENABLE_DEBUG=false
```

## Database Setup

### 1. Create Database

First, create a PostgreSQL database:

```sql
CREATE DATABASE sequences_db;
```

### 2. Create Your Tables

You'll need to create your own database schema. Here's an example of what you might want to create:

```sql
-- Example tables for sequences application
CREATE TABLE sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    config JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sequence_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_type VARCHAR(100) NOT NULL,
    step_config JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Usage in Code

### Basic Database Operations

```typescript
import { db, sql } from "./src/db/index.js";
import QueryBuilder from "./src/db/queries/index.js";

// Test connection
await db.testConnection();

// Using tagged templates (recommended - SQL injection safe)
const users = await sql`SELECT * FROM users WHERE status = ${"active"}`;
const user = await sql`SELECT * FROM users WHERE id = ${userId}`;

// Using QueryBuilder for common operations
const sequences = await QueryBuilder.findAll("sequences", { status: "active" });
const sequence = await QueryBuilder.findById("sequences", "some-uuid");

// Raw queries (use with caution)
const result = await db.raw("SELECT * FROM users WHERE status = $1", ["active"]);
```

### Advanced Tagged Template Usage

```typescript
import { sql } from "./src/db/index.js";

// Complex queries with multiple parameters
const results = await sql`
  SELECT u.*, p.name as profile_name
  FROM users u
  LEFT JOIN profiles p ON u.id = p.user_id
  WHERE u.status = ${"active"}
    AND u.created_at > ${new Date("2023-01-01")}
    AND u.role IN ${["admin", "user"]}
  ORDER BY u.created_at DESC
  LIMIT ${10}
`;

// Dynamic table names (use sql.identifier for safety)
const tableName = "users";
const results = await sql`SELECT * FROM ${sql(tableName)} WHERE id = ${userId}`;

// Array operations
const userIds = [1, 2, 3, 4];
const users = await sql`SELECT * FROM users WHERE id = ANY(${userIds})`;

// JSON operations
const config = { theme: "dark", notifications: true };
const result = await sql`
  INSERT INTO user_settings (user_id, config)
  VALUES (${userId}, ${JSON.stringify(config)})
  RETURNING *
`;
```

### Transactions

```typescript
import { db } from "./src/db/index.js";

// Using the Database class transaction method
await db.transaction(async (sql) => {
  const user = await sql`
    INSERT INTO users (name, email)
    VALUES (${"John Doe"}, ${"john@example.com"})
    RETURNING *
  `;

  await sql`
    INSERT INTO profiles (user_id, bio)
    VALUES (${user[0].id}, ${"Software developer"})
  `;
});

// Using postgres.js begin directly
import { sql } from "./src/db/index.js";

await sql.begin(async (sql) => {
  const user = await sql`INSERT INTO users (name) VALUES (${"Jane"}) RETURNING *`;
  await sql`INSERT INTO profiles (user_id) VALUES (${user[0].id})`;
});
```

### QueryBuilder Methods

```typescript
import QueryBuilder from "./src/db/queries/index.js";

// Find operations
const user = await QueryBuilder.findById("users", "user-id");
const users = await QueryBuilder.findAll("users", { status: "active" }, 10, 0);
const count = await QueryBuilder.count("users", { status: "active" });

// Search operations
const results = await QueryBuilder.search("users", "name", "john");
const users = await QueryBuilder.findIn("users", "id", [1, 2, 3]);
const recent = await QueryBuilder.findBetween("users", "created_at", startDate, endDate);

// CRUD operations
const newUser = await QueryBuilder.insert("users", {
  name: "John Doe",
  email: "john@example.com",
});

const updated = await QueryBuilder.updateById("users", "user-id", {
  name: "Jane Doe",
});

const deleted = await QueryBuilder.deleteById("users", "user-id");

// Pagination
const page = await QueryBuilder.paginate(
  "users",
  1,
  10,
  { status: "active" },
  {
    column: "created_at",
    direction: "DESC",
  },
);
```

## Schema Management

Since there's no migration system, you'll need to manage your database schema manually. Here are some recommendations:

1. **Version Control**: Keep your SQL schema files in version control
2. **Documentation**: Document schema changes in your commit messages
3. **Backup**: Always backup your database before making schema changes
4. **Testing**: Test schema changes in a development environment first

## Connection Pool Configuration

The database connection uses postgres.js with the following settings:

- **Max connections**: 20
- **Idle timeout**: 30 seconds
- **Connection timeout**: 10 seconds
- **Debug mode**: Enabled in development
- **Transform undefined**: Automatically converts undefined to null

These settings can be modified in `src/db/index.ts` if needed.

## Error Handling

postgres.js provides excellent error handling:

- **SQL injection protection**: Built-in through tagged templates
- **Type safety**: Full TypeScript support with proper typing
- **Connection errors**: Automatically handled with retry logic
- **Query errors**: Detailed error information with query context
- **Transaction rollback**: Automatic rollback on errors

## Performance Features

postgres.js is optimized for performance:

- **Connection pooling**: Efficient connection management
- **Prepared statements**: Automatic statement preparation
- **Binary protocol**: Uses PostgreSQL's binary protocol for better performance
- **Streaming**: Support for streaming large result sets
- **Lazy connections**: Connections are created only when needed

## Development Tips

1. **Use tagged templates**: Always prefer `sql`\`query\` over raw strings
2. **Type your results**: Use TypeScript interfaces for better type safety
3. **Handle undefined**: postgres.js converts undefined to null automatically
4. **Use transactions**: For operations that modify multiple tables
5. **Leverage QueryBuilder**: For common operations to maintain consistency
6. **Test queries**: Use the test script to verify your setup

## Example: Complete User Management

```typescript
import { sql } from "./src/db/index.js";

interface User {
  id: string;
  name: string;
  email: string;
  created_at: Date;
}

// Create user with profile
async function createUserWithProfile(name: string, email: string, bio: string) {
  return await sql.begin(async (sql) => {
    const [user] = await sql<User[]>`
      INSERT INTO users (name, email)
      VALUES (${name}, ${email})
      RETURNING *
    `;

    await sql`
      INSERT INTO profiles (user_id, bio)
      VALUES (${user.id}, ${bio})
    `;

    return user;
  });
}

// Get user with profile
async function getUserWithProfile(userId: string) {
  const [result] = await sql`
    SELECT u.*, p.bio
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id
    WHERE u.id = ${userId}
  `;

  return result;
}

// Search users
async function searchUsers(searchTerm: string, limit: number = 10) {
  return await sql<User[]>`
    SELECT * FROM users
    WHERE name ILIKE ${`%${searchTerm}%`}
       OR email ILIKE ${`%${searchTerm}%`}
    ORDER BY name
    LIMIT ${limit}
  `;
}
```
