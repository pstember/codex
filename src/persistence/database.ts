import { DatabaseSync } from "node:sqlite";
import type { AuthStore } from "@/domain/auth";
import type { Product } from "@/domain/product";
import type { AuthenticatedUser, User } from "@/domain/users";

export interface CommerceDatabase extends AuthStore {
  close(): void;
  seedProducts(products: Product[]): void;
  seedUsers(users: User[]): void;
  countProducts(): number;
  countUsers(): number;
}

export function createCommerceDatabase(path = ":memory:"): CommerceDatabase {
  const database = new DatabaseSync(path);

  database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      margin_percent REAL NOT NULL,
      inventory INTEGER NOT NULL,
      conversion_rate REAL NOT NULL,
      return_rate REAL NOT NULL,
      tags_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      expires_at TEXT NOT NULL
    );
  `);

  const insertProduct = database.prepare(`
    INSERT INTO products (
      id,
      name,
      category,
      price,
      margin_percent,
      inventory,
      conversion_rate,
      return_rate,
      tags_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      price = excluded.price,
      margin_percent = excluded.margin_percent,
      inventory = excluded.inventory,
      conversion_rate = excluded.conversion_rate,
      return_rate = excluded.return_rate,
      tags_json = excluded.tags_json;
  `);

  const insertUser = database.prepare(`
    INSERT INTO users (id, email, name, role)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      name = excluded.name,
      role = excluded.role;
  `);

  const insertSession = database.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?);
  `);

  const findUserByEmailStatement = database.prepare(`
    SELECT id, email, name, role FROM users WHERE email = ?;
  `);

  const findUserBySessionStatement = database.prepare(`
    SELECT
      users.id,
      users.email,
      users.name,
      users.role,
      sessions.id AS sessionId,
      sessions.expires_at AS expiresAt
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.id = ?;
  `);

  const deleteSessionStatement = database.prepare(`
    DELETE FROM sessions WHERE id = ?;
  `);

  return {
    close() {
      database.close();
    },
    seedProducts(products) {
      database.exec("BEGIN");

      try {
        for (const product of products) {
          insertProduct.run(
            product.id,
            product.name,
            product.category,
            product.price,
            product.marginPercent,
            product.inventory,
            product.conversionRate,
            product.returnRate,
            JSON.stringify(product.tags),
          );
        }

        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
    seedUsers(users) {
      database.exec("BEGIN");

      try {
        for (const user of users) {
          insertUser.run(user.id, user.email, user.name, user.role);
        }

        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
    countProducts() {
      const row = database.prepare("SELECT COUNT(*) AS count FROM products").get() as {
        count: number;
      };

      return row.count;
    },
    countUsers() {
      const row = database.prepare("SELECT COUNT(*) AS count FROM users").get() as {
        count: number;
      };

      return row.count;
    },
    findUserByEmail(email) {
      return (findUserByEmailStatement.get(email) as User | undefined) ?? null;
    },
    createSession(session) {
      insertSession.run(session.id, session.userId, session.expiresAt.toISOString());
    },
    findUserBySession(sessionId, now) {
      const row = findUserBySessionStatement.get(sessionId) as
        | (AuthenticatedUser & { expiresAt: string })
        | undefined;

      if (!row) {
        return null;
      }

      if (new Date(row.expiresAt).getTime() <= now.getTime()) {
        deleteSessionStatement.run(sessionId);
        return null;
      }

      return {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        sessionId: row.sessionId,
      };
    },
    deleteSession(sessionId) {
      deleteSessionStatement.run(sessionId);
    },
  };
}
