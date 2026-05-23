import { createRequire } from "node:module";
import type { AuthStore } from "@/domain/auth";
import type { CodexRun, CodexRunEvent } from "@/domain/codexRun";
import type { CommerceData } from "@/domain/commerce";
import type { MetricsTrace } from "@/domain/metricsTrace";
import type { CampaignProposal } from "@/domain/operatorCampaign";
import type { Product } from "@/domain/product";
import type { CampaignVisualAsset, StorefrontConfig } from "@/domain/storefront";
import type { GeneratedStorefrontConfig } from "@/domain/storefrontGeneration";
import type { PublishedStorefrontVersion } from "@/domain/storefrontPublishing";
import type { AuthenticatedUser, User } from "@/domain/users";

const { DatabaseSync } = createRequire(import.meta.url)(
  "node:sqlite",
) as typeof import("node:sqlite");

export interface CommerceDatabase extends AuthStore {
  close(): void;
  seedProducts(products: Product[]): void;
  seedCommerceData(data: CommerceData): void;
  seedUsers(users: User[]): void;
  countProducts(): number;
  countCustomers(): number;
  countOrders(): number;
  countPromotions(): number;
  countUsers(): number;
  saveMetricsTrace(trace: MetricsTrace): void;
  listRecentMetricsTraces(limit?: number): MetricsTrace[];
  findMetricsTraceById(id: string): MetricsTrace | null;
  saveCampaignProposal(proposal: CampaignProposal): void;
  listRecentCampaignProposals(limit?: number): CampaignProposal[];
  findCampaignProposalById(id: string): CampaignProposal | null;
  saveStorefrontConfig(storefrontConfig: GeneratedStorefrontConfig): void;
  listRecentStorefrontConfigs(limit?: number): GeneratedStorefrontConfig[];
  findStorefrontConfigById(id: string): GeneratedStorefrontConfig | null;
  savePublishedStorefrontVersion(version: PublishedStorefrontVersion): void;
  listPublishedStorefrontVersions(limit?: number): PublishedStorefrontVersion[];
  findPublishedStorefrontVersionById(id: string): PublishedStorefrontVersion | null;
  findActiveStorefrontVersion(): PublishedStorefrontVersion | null;
  saveCodexRun(run: CodexRun): void;
  saveCodexRunEvent(event: CodexRunEvent): void;
  listCodexRunEvents(runId: string): CodexRunEvent[];
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
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS commerce_customers (
      id TEXT PRIMARY KEY,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS commerce_addresses (
      id TEXT PRIMARY KEY,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS commerce_orders (
      id TEXT PRIMARY KEY,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS commerce_inventory_locations (
      id TEXT PRIMARY KEY,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS commerce_stock_positions (
      product_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      data_json TEXT NOT NULL,
      PRIMARY KEY (product_id, location_id)
    );

    CREATE TABLE IF NOT EXISTS commerce_returns (
      id TEXT PRIMARY KEY,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS commerce_email_events (
      id TEXT PRIMARY KEY,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS commerce_promotions (
      id TEXT PRIMARY KEY,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS metrics_traces (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      operation_name TEXT NOT NULL,
      validation_status TEXT NOT NULL,
      validation_errors_json TEXT NOT NULL DEFAULT '[]',
      generated_graphql TEXT NOT NULL DEFAULT '',
      rationale TEXT NOT NULL DEFAULT '',
      chart_type TEXT NOT NULL,
      recommended_product_ids_json TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS campaign_proposals (
      id TEXT PRIMARY KEY,
      source_trace_id TEXT NOT NULL,
      campaign_json TEXT NOT NULL,
      validation_status TEXT NOT NULL,
      validation_errors_json TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS storefront_configs (
      id TEXT PRIMARY KEY,
      source_proposal_id TEXT NOT NULL,
      config_json TEXT NOT NULL,
      validation_status TEXT NOT NULL,
      validation_errors_json TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS published_storefront_versions (
      id TEXT PRIMARY KEY,
      source_storefront_config_id TEXT NOT NULL,
      config_json TEXT NOT NULL,
      status TEXT NOT NULL,
      rollback_of_version_id TEXT,
      published_by_user_id TEXT NOT NULL,
      published_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS codex_runs (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS codex_run_events (
      sequence INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL REFERENCES codex_runs(id),
      stage TEXT NOT NULL,
      message TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS codex_run_events_order_idx
      ON codex_run_events (run_id, occurred_at, sequence);
  `);

  const metricTraceColumns = database.prepare("PRAGMA table_info(metrics_traces);").all() as Array<{
    name: string;
  }>;
  const metricTraceColumnNames = new Set(metricTraceColumns.map((column) => column.name));

  if (!metricTraceColumnNames.has("validation_errors_json")) {
    database.exec(
      "ALTER TABLE metrics_traces ADD COLUMN validation_errors_json TEXT NOT NULL DEFAULT '[]';",
    );
  }

  if (!metricTraceColumnNames.has("generated_graphql")) {
    database.exec(
      "ALTER TABLE metrics_traces ADD COLUMN generated_graphql TEXT NOT NULL DEFAULT '';",
    );
  }

  if (!metricTraceColumnNames.has("rationale")) {
    database.exec("ALTER TABLE metrics_traces ADD COLUMN rationale TEXT NOT NULL DEFAULT '';");
  }

  const userColumns = database.prepare("PRAGMA table_info(users);").all() as Array<{
    name: string;
  }>;
  const userColumnNames = new Set(userColumns.map((column) => column.name));

  if (!userColumnNames.has("password_hash")) {
    database.exec("ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';");
  }

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
    INSERT INTO users (id, email, name, role, password_hash)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      name = excluded.name,
      role = excluded.role,
      password_hash = excluded.password_hash;
  `);

  const insertSession = database.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?);
  `);

  const upsertCommerceCustomer = database.prepare(`
    INSERT INTO commerce_customers (id, data_json)
    VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json;
  `);

  const upsertCommerceAddress = database.prepare(`
    INSERT INTO commerce_addresses (id, data_json)
    VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json;
  `);

  const upsertCommerceOrder = database.prepare(`
    INSERT INTO commerce_orders (id, data_json)
    VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json;
  `);

  const upsertCommerceInventoryLocation = database.prepare(`
    INSERT INTO commerce_inventory_locations (id, data_json)
    VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json;
  `);

  const upsertCommerceStockPosition = database.prepare(`
    INSERT INTO commerce_stock_positions (product_id, location_id, data_json)
    VALUES (?, ?, ?)
    ON CONFLICT(product_id, location_id) DO UPDATE SET data_json = excluded.data_json;
  `);

  const upsertCommerceReturn = database.prepare(`
    INSERT INTO commerce_returns (id, data_json)
    VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json;
  `);

  const upsertCommerceEmailEvent = database.prepare(`
    INSERT INTO commerce_email_events (id, data_json)
    VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json;
  `);

  const upsertCommercePromotion = database.prepare(`
    INSERT INTO commerce_promotions (id, data_json)
    VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json;
  `);

  const findUserByEmailStatement = database.prepare(`
    SELECT id, email, name, role, password_hash AS passwordHash FROM users WHERE email = ?;
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
      validation_errors_json,
      generated_graphql,
      rationale,
      chart_type,
      recommended_product_ids_json,
      created_by_user_id,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      question = excluded.question,
      operation_name = excluded.operation_name,
      validation_status = excluded.validation_status,
      validation_errors_json = excluded.validation_errors_json,
      generated_graphql = excluded.generated_graphql,
      rationale = excluded.rationale,
      chart_type = excluded.chart_type,
      recommended_product_ids_json = excluded.recommended_product_ids_json,
      created_by_user_id = excluded.created_by_user_id,
      created_at = excluded.created_at;
  `);

  const insertCodexRun = database.prepare(`
    INSERT INTO codex_runs (
      id,
      question,
      created_by_user_id,
      created_at
    )
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      question = excluded.question,
      created_by_user_id = excluded.created_by_user_id,
      created_at = excluded.created_at;
  `);

  const insertCodexRunEvent = database.prepare(`
    INSERT INTO codex_run_events (
      run_id,
      stage,
      message,
      occurred_at,
      payload_json
    )
    VALUES (?, ?, ?, ?, ?);
  `);

  const listCodexRunEvents = database.prepare(`
    SELECT
      run_id AS runId,
      stage,
      message,
      occurred_at AS occurredAt,
      payload_json AS payloadJson
    FROM codex_run_events
    WHERE run_id = ?
    ORDER BY occurred_at ASC, sequence ASC;
  `);

  const listMetricsTraces = database.prepare(`
    SELECT
      id,
      question,
      operation_name AS operationName,
      validation_status AS validationStatus,
      validation_errors_json AS validationErrorsJson,
      generated_graphql AS generatedGraphql,
      rationale,
      chart_type AS chartType,
      recommended_product_ids_json AS recommendedProductIdsJson,
      created_by_user_id AS createdByUserId,
      created_at AS createdAt
    FROM metrics_traces
    ORDER BY created_at DESC
    LIMIT ?;
  `);

  const findMetricsTrace = database.prepare(`
    SELECT
      id,
      question,
      operation_name AS operationName,
      validation_status AS validationStatus,
      validation_errors_json AS validationErrorsJson,
      generated_graphql AS generatedGraphql,
      rationale,
      chart_type AS chartType,
      recommended_product_ids_json AS recommendedProductIdsJson,
      created_by_user_id AS createdByUserId,
      created_at AS createdAt
    FROM metrics_traces
    WHERE id = ?;
  `);

  const insertCampaignProposal = database.prepare(`
    INSERT INTO campaign_proposals (
      id,
      source_trace_id,
      campaign_json,
      validation_status,
      validation_errors_json,
      created_by_user_id,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      source_trace_id = excluded.source_trace_id,
      campaign_json = excluded.campaign_json,
      validation_status = excluded.validation_status,
      validation_errors_json = excluded.validation_errors_json,
      created_by_user_id = excluded.created_by_user_id,
      created_at = excluded.created_at;
  `);

  const listCampaignProposals = database.prepare(`
    SELECT
      id,
      source_trace_id AS sourceTraceId,
      campaign_json AS campaignJson,
      validation_status AS validationStatus,
      validation_errors_json AS validationErrorsJson,
      created_by_user_id AS createdByUserId,
      created_at AS createdAt
    FROM campaign_proposals
    ORDER BY created_at DESC
    LIMIT ?;
  `);

  const findCampaignProposal = database.prepare(`
    SELECT
      id,
      source_trace_id AS sourceTraceId,
      campaign_json AS campaignJson,
      validation_status AS validationStatus,
      validation_errors_json AS validationErrorsJson,
      created_by_user_id AS createdByUserId,
      created_at AS createdAt
    FROM campaign_proposals
    WHERE id = ?;
  `);

  const insertStorefrontConfig = database.prepare(`
    INSERT INTO storefront_configs (
      id,
      source_proposal_id,
      config_json,
      validation_status,
      validation_errors_json,
      created_by_user_id,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      source_proposal_id = excluded.source_proposal_id,
      config_json = excluded.config_json,
      validation_status = excluded.validation_status,
      validation_errors_json = excluded.validation_errors_json,
      created_by_user_id = excluded.created_by_user_id,
      created_at = excluded.created_at;
  `);

  const listStorefrontConfigs = database.prepare(`
    SELECT
      id,
      source_proposal_id AS sourceProposalId,
      config_json AS configJson,
      validation_status AS validationStatus,
      validation_errors_json AS validationErrorsJson,
      created_by_user_id AS createdByUserId,
      created_at AS createdAt
    FROM storefront_configs
    ORDER BY created_at DESC
    LIMIT ?;
  `);

  const findStorefrontConfig = database.prepare(`
    SELECT
      id,
      source_proposal_id AS sourceProposalId,
      config_json AS configJson,
      validation_status AS validationStatus,
      validation_errors_json AS validationErrorsJson,
      created_by_user_id AS createdByUserId,
      created_at AS createdAt
    FROM storefront_configs
    WHERE id = ?;
  `);

  const deactivateActiveStorefrontVersions = database.prepare(`
    UPDATE published_storefront_versions
    SET status = 'inactive'
    WHERE status = 'active';
  `);

  const insertPublishedStorefrontVersion = database.prepare(`
    INSERT INTO published_storefront_versions (
      id,
      source_storefront_config_id,
      config_json,
      status,
      rollback_of_version_id,
      published_by_user_id,
      published_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      source_storefront_config_id = excluded.source_storefront_config_id,
      config_json = excluded.config_json,
      status = excluded.status,
      rollback_of_version_id = excluded.rollback_of_version_id,
      published_by_user_id = excluded.published_by_user_id,
      published_at = excluded.published_at;
  `);

  const listPublishedStorefrontVersions = database.prepare(`
    SELECT
      id,
      source_storefront_config_id AS sourceStorefrontConfigId,
      config_json AS configJson,
      status,
      rollback_of_version_id AS rollbackOfVersionId,
      published_by_user_id AS publishedByUserId,
      published_at AS publishedAt
    FROM published_storefront_versions
    ORDER BY published_at DESC
    LIMIT ?;
  `);

  const findPublishedStorefrontVersion = database.prepare(`
    SELECT
      id,
      source_storefront_config_id AS sourceStorefrontConfigId,
      config_json AS configJson,
      status,
      rollback_of_version_id AS rollbackOfVersionId,
      published_by_user_id AS publishedByUserId,
      published_at AS publishedAt
    FROM published_storefront_versions
    WHERE id = ?;
  `);

  const findActivePublishedStorefrontVersion = database.prepare(`
    SELECT
      id,
      source_storefront_config_id AS sourceStorefrontConfigId,
      config_json AS configJson,
      status,
      rollback_of_version_id AS rollbackOfVersionId,
      published_by_user_id AS publishedByUserId,
      published_at AS publishedAt
    FROM published_storefront_versions
    WHERE status = 'active'
    ORDER BY published_at DESC
    LIMIT 1;
  `);

  function parseMetricsTraceRow(row: {
    id: string;
    question: string;
    operationName: string;
    validationStatus: MetricsTrace["validationStatus"];
    validationErrorsJson: string;
    generatedGraphql: string;
    rationale: string;
    chartType: MetricsTrace["chartType"];
    recommendedProductIdsJson: string;
    createdByUserId: string;
    createdAt: string;
  }): MetricsTrace {
    return {
      id: row.id,
      question: row.question,
      operationName: row.operationName,
      validationStatus: row.validationStatus,
      validationErrors: JSON.parse(row.validationErrorsJson) as string[],
      generatedGraphql: row.generatedGraphql,
      rationale: row.rationale,
      chartType: row.chartType,
      recommendedProductIds: JSON.parse(row.recommendedProductIdsJson) as string[],
      createdByUserId: row.createdByUserId,
      createdAt: new Date(row.createdAt),
    };
  }

  function parseCodexRunEventRow(row: {
    runId: string;
    stage: string;
    message: string;
    occurredAt: string;
    payloadJson: string;
  }): CodexRunEvent {
    return {
      runId: row.runId,
      stage: row.stage,
      message: row.message,
      occurredAt: new Date(row.occurredAt),
      payload: JSON.parse(row.payloadJson) as Record<string, unknown>,
    };
  }

  function parseCampaignProposalRow(row: {
    id: string;
    sourceTraceId: string;
    campaignJson: string;
    validationStatus: CampaignProposal["validationStatus"];
    validationErrorsJson: string;
    createdByUserId: string;
    createdAt: string;
  }): CampaignProposal {
    return {
      id: row.id,
      sourceTraceId: row.sourceTraceId,
      campaign: JSON.parse(row.campaignJson) as CampaignProposal["campaign"],
      validationStatus: row.validationStatus,
      validationErrors: JSON.parse(row.validationErrorsJson) as string[],
      createdByUserId: row.createdByUserId,
      createdAt: new Date(row.createdAt),
    };
  }

  function parseStorefrontConfigRow(row: {
    id: string;
    sourceProposalId: string;
    configJson: string;
    validationStatus: GeneratedStorefrontConfig["validationStatus"];
    validationErrorsJson: string;
    createdByUserId: string;
    createdAt: string;
  }): GeneratedStorefrontConfig {
    return {
      id: row.id,
      sourceProposalId: row.sourceProposalId,
      config: parseStorefrontConfigJson(row.configJson),
      validationStatus: row.validationStatus,
      validationErrors: JSON.parse(row.validationErrorsJson) as string[],
      createdByUserId: row.createdByUserId,
      createdAt: new Date(row.createdAt),
    };
  }

  function parsePublishedStorefrontVersionRow(row: {
    id: string;
    sourceStorefrontConfigId: string;
    configJson: string;
    status: PublishedStorefrontVersion["status"];
    rollbackOfVersionId: string | null;
    publishedByUserId: string;
    publishedAt: string;
  }): PublishedStorefrontVersion {
    return {
      id: row.id,
      sourceStorefrontConfigId: row.sourceStorefrontConfigId,
      config: parseStorefrontConfigJson(row.configJson),
      status: row.status,
      rollbackOfVersionId: row.rollbackOfVersionId,
      publishedByUserId: row.publishedByUserId,
      publishedAt: new Date(row.publishedAt),
    };
  }

  function parseStorefrontConfigJson(configJson: string): StorefrontConfig {
    const config = JSON.parse(configJson) as StorefrontConfig;

    return {
      ...config,
      visualAsset: config.visualAsset ?? fallbackVisualAssetFor(config),
    };
  }

  function fallbackVisualAssetFor(config: StorefrontConfig): CampaignVisualAsset {
    if (config.campaignId === "secret-santa-2026") {
      return {
        id: "secret-santa-2026-hero-asset",
        campaignId: "secret-santa-2026",
        prompt: "Playful office Secret Santa gifting.",
        alt: "A festive desk scene with wrapped small gifts from Atlas & Co.",
        source: "static",
        path: "/static-assets/secret-santa-hero.svg",
      };
    }

    if (config.campaignId === "fathers-day-2026") {
      return {
        id: "fathers-day-2026-hero-asset",
        campaignId: "fathers-day-2026",
        prompt: "Warm outdoor Father’s Day gifting scene.",
        alt: "A warm outdoor Father’s Day gifting scene with grilling and travel essentials.",
        source: "static",
        path: "/static-assets/fathers-day-hero.svg",
      };
    }

    return {
      id: "evergreen-hero-asset",
      campaignId: config.campaignId,
      prompt: "Evergreen Atlas & Co. product curation.",
      alt: "A clean Atlas & Co. arrangement of coffee, desk, and travel essentials.",
      source: "static",
      path: "/static-assets/baseline-hero.svg",
    };
  }

  function countRows(tableName: string): number {
    const row = database.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get() as {
      count: number;
    };

    return row.count;
  }

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
    seedCommerceData(data) {
      database.exec("BEGIN");

      try {
        for (const customer of data.customers) {
          upsertCommerceCustomer.run(customer.id, JSON.stringify(customer));
        }

        for (const address of data.addresses) {
          upsertCommerceAddress.run(address.id, JSON.stringify(address));
        }

        for (const order of data.orders) {
          upsertCommerceOrder.run(order.id, JSON.stringify(order));
        }

        for (const location of data.inventoryLocations) {
          upsertCommerceInventoryLocation.run(location.id, JSON.stringify(location));
        }

        for (const stockPosition of data.stockPositions) {
          upsertCommerceStockPosition.run(
            stockPosition.productId,
            stockPosition.locationId,
            JSON.stringify(stockPosition),
          );
        }

        for (const returnRequest of data.returns) {
          upsertCommerceReturn.run(returnRequest.id, JSON.stringify(returnRequest));
        }

        for (const emailEvent of data.emailEvents) {
          upsertCommerceEmailEvent.run(emailEvent.id, JSON.stringify(emailEvent));
        }

        for (const promotion of data.promotions) {
          upsertCommercePromotion.run(promotion.id, JSON.stringify(promotion));
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
        database.prepare("DELETE FROM sessions WHERE user_id = ?").run("demo-guest");
        database.prepare("DELETE FROM users WHERE id = ?").run("demo-guest");

        for (const user of users) {
          insertUser.run(user.id, user.email, user.name, user.role, user.passwordHash);
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
    countCustomers() {
      return countRows("commerce_customers");
    },
    countOrders() {
      return countRows("commerce_orders");
    },
    countPromotions() {
      return countRows("commerce_promotions");
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
        JSON.stringify(trace.validationErrors),
        trace.generatedGraphql,
        trace.rationale,
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
        validationErrorsJson: string;
        generatedGraphql: string;
        rationale: string;
        chartType: MetricsTrace["chartType"];
        recommendedProductIdsJson: string;
        createdByUserId: string;
        createdAt: string;
      }>;

      return rows.map(parseMetricsTraceRow);
    },
    findMetricsTraceById(id) {
      const row = findMetricsTrace.get(id) as
        | Parameters<typeof parseMetricsTraceRow>[0]
        | undefined;

      return row ? parseMetricsTraceRow(row) : null;
    },
    saveCampaignProposal(proposal) {
      insertCampaignProposal.run(
        proposal.id,
        proposal.sourceTraceId,
        JSON.stringify(proposal.campaign),
        proposal.validationStatus,
        JSON.stringify(proposal.validationErrors),
        proposal.createdByUserId,
        proposal.createdAt.toISOString(),
      );
    },
    listRecentCampaignProposals(limit = 5) {
      const rows = listCampaignProposals.all(limit) as Array<
        Parameters<typeof parseCampaignProposalRow>[0]
      >;

      return rows.map(parseCampaignProposalRow);
    },
    findCampaignProposalById(id) {
      const row = findCampaignProposal.get(id) as
        | Parameters<typeof parseCampaignProposalRow>[0]
        | undefined;

      return row ? parseCampaignProposalRow(row) : null;
    },
    saveStorefrontConfig(storefrontConfig) {
      insertStorefrontConfig.run(
        storefrontConfig.id,
        storefrontConfig.sourceProposalId,
        JSON.stringify(storefrontConfig.config),
        storefrontConfig.validationStatus,
        JSON.stringify(storefrontConfig.validationErrors),
        storefrontConfig.createdByUserId,
        storefrontConfig.createdAt.toISOString(),
      );
    },
    listRecentStorefrontConfigs(limit = 5) {
      const rows = listStorefrontConfigs.all(limit) as Array<
        Parameters<typeof parseStorefrontConfigRow>[0]
      >;

      return rows.map(parseStorefrontConfigRow);
    },
    findStorefrontConfigById(id) {
      const row = findStorefrontConfig.get(id) as
        | Parameters<typeof parseStorefrontConfigRow>[0]
        | undefined;

      return row ? parseStorefrontConfigRow(row) : null;
    },
    savePublishedStorefrontVersion(version) {
      database.exec("BEGIN");

      try {
        if (version.status === "active") {
          deactivateActiveStorefrontVersions.run();
        }

        insertPublishedStorefrontVersion.run(
          version.id,
          version.sourceStorefrontConfigId,
          JSON.stringify(version.config),
          version.status,
          version.rollbackOfVersionId,
          version.publishedByUserId,
          version.publishedAt.toISOString(),
        );

        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
    listPublishedStorefrontVersions(limit = 10) {
      const rows = listPublishedStorefrontVersions.all(limit) as Array<
        Parameters<typeof parsePublishedStorefrontVersionRow>[0]
      >;

      return rows.map(parsePublishedStorefrontVersionRow);
    },
    findPublishedStorefrontVersionById(id) {
      const row = findPublishedStorefrontVersion.get(id) as
        | Parameters<typeof parsePublishedStorefrontVersionRow>[0]
        | undefined;

      return row ? parsePublishedStorefrontVersionRow(row) : null;
    },
    findActiveStorefrontVersion() {
      const row = findActivePublishedStorefrontVersion.get() as
        | Parameters<typeof parsePublishedStorefrontVersionRow>[0]
        | undefined;

      return row ? parsePublishedStorefrontVersionRow(row) : null;
    },
    saveCodexRun(run) {
      insertCodexRun.run(run.id, run.question, run.createdByUserId, run.createdAt.toISOString());
    },
    saveCodexRunEvent(event) {
      insertCodexRunEvent.run(
        event.runId,
        event.stage,
        event.message,
        event.occurredAt.toISOString(),
        JSON.stringify(event.payload),
      );
    },
    listCodexRunEvents(runId) {
      const rows = listCodexRunEvents.all(runId) as Array<
        Parameters<typeof parseCodexRunEventRow>[0]
      >;

      return rows.map(parseCodexRunEventRow);
    },
  };
}
