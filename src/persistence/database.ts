import { DatabaseSync } from "node:sqlite";
import type { AuthStore } from "@/domain/auth";
import type { MetricsTrace } from "@/domain/metricsTrace";
import type { Product } from "@/domain/product";
import type { AuthenticatedUser, User } from "@/domain/users";

export interface CommerceDatabase extends AuthStore {
  close(): void;
  seedProducts(products: Product[]): void;
  seedUsers(users: User[]): void;
  countProducts(): number;
  countUsers(): number;
  saveMetricsTrace(trace: MetricsTrace): void;
  listRecentMetricsTraces(limit?: number): MetricsTrace[];
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

    CREATE TABLE IF NOT EXISTS metrics_traces (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      operation_name TEXT NOT NULL,
      validation_status TEXT NOT NULL,
      chart_type TEXT NOT NULL,
      recommended_product_ids_json TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL
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

  const insertMetricsTrace = database.prepare(`
    INSERT INTO metrics_traces (
      id,
      question,
      operation_name,
      validation_status,
      chart_type,
      recommended_product_ids_json,
      created_by_user_id,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      question = excluded.question,
      operation_name = excluded.operation_name,
      validation_status = excluded.validation_status,
      chart_type = excluded.chart_type,
      recommended_product_ids_json = excluded.recommended_product_ids_json,
      created_by_user_id = excluded.created_by_user_id,
      created_at = excluded.created_at;
  `);

  const listMetricsTraces = database.prepare(`
    SELECT
      id,
      question,
      operation_name AS operationName,
      validation_status AS validationStatus,
      chart_type AS chartType,
      recommended_product_ids_json AS recommendedProductIdsJson,
      created_by_user_id AS createdByUserId,
      created_at AS createdAt
    FROM metrics_traces
    ORDER BY created_at DESC
    LIMIT ?;
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
    saveMetricsTrace(trace) {
      insertMetricsTrace.run(
        trace.id,
        trace.question,
        trace.operationName,
        trace.validationStatus,
        trace.chartType,
        JSON.stringify(trace.recommendedProductIds),
        trace.createdByUserId,
        trace.createdAt.toISOString(),
      );
    },
    listRecentMetricsTraces(limit = 5) {
      const rows = listMetricsTraces.all(limit) as Array<{
        id: string;
        question: string;
        operationName: string;
        validationStatus: MetricsTrace["validationStatus"];
        chartType: MetricsTrace["chartType"];
        recommendedProductIdsJson: string;
        createdByUserId: string;
        createdAt: string;
      }>;

      return rows.map((row) => ({
        id: row.id,
        question: row.question,
        operationName: row.operationName,
        validationStatus: row.validationStatus,
        chartType: row.chartType,
        recommendedProductIds: JSON.parse(row.recommendedProductIdsJson) as string[],
        createdByUserId: row.createdByUserId,
        createdAt: new Date(row.createdAt),
      }));
    },
  };
}
