import { createRequire } from "node:module";
import type { AuthStore } from "@/domain/auth";
import type { CodexRun, CodexRunEvent } from "@/domain/codexRun";
import {
  type CampaignVisualAsset,
  hydrateLegacyStorefrontSectionIntents,
  type StorefrontConfig,
} from "@/domain/storefront";
import type { GeneratedStorefrontConfig } from "@/domain/storefrontDraft";
import type { PublishedStorefrontVersion } from "@/domain/storefrontPublishing";
import type { AuthenticatedUser, User } from "@/domain/users";

const { DatabaseSync } = createRequire(import.meta.url)(
  "node:sqlite",
) as typeof import("node:sqlite");

export interface CommerceDatabase extends AuthStore {
  close(): void;
  seedUsers(users: User[]): void;
  countUsers(): number;
  saveStorefrontConfig(storefrontConfig: GeneratedStorefrontConfig): void;
  listRecentStorefrontConfigs(limit?: number): GeneratedStorefrontConfig[];
  findStorefrontConfigById(id: string): GeneratedStorefrontConfig | null;
  deleteStorefrontConfig(id: string): void;
  savePublishedStorefrontVersion(version: PublishedStorefrontVersion): void;
  listPublishedStorefrontVersions(limit?: number): PublishedStorefrontVersion[];
  findPublishedStorefrontVersionById(id: string): PublishedStorefrontVersion | null;
  findActiveStorefrontVersion(): PublishedStorefrontVersion | null;
  saveCodexRun(run: CodexRun): void;
  saveCodexRunEvent(event: CodexRunEvent): void;
  listRecentCodexRuns(limit?: number): CodexRun[];
  listCodexRunEvents(runId: string): CodexRunEvent[];
}

export function createCommerceDatabase(path = ":memory:"): CommerceDatabase {
  const database = new DatabaseSync(path);

  database.exec(`
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

    CREATE TABLE IF NOT EXISTS storefront_configs (
      id TEXT PRIMARY KEY,
      source_draft_key TEXT NOT NULL,
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

  const userColumns = database.prepare("PRAGMA table_info(users);").all() as Array<{
    name: string;
  }>;
  const userColumnNames = new Set(userColumns.map((column) => column.name));

  if (!userColumnNames.has("password_hash")) {
    database.exec("ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';");
  }

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

  const listRecentCodexRuns = database.prepare(`
    SELECT
      id,
      question,
      created_by_user_id AS createdByUserId,
      created_at AS createdAt
    FROM codex_runs
    ORDER BY created_at DESC
    LIMIT ?;
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

  const insertStorefrontConfig = database.prepare(`
    INSERT INTO storefront_configs (
      id,
      source_draft_key,
      config_json,
      validation_status,
      validation_errors_json,
      created_by_user_id,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      source_draft_key = excluded.source_draft_key,
      config_json = excluded.config_json,
      validation_status = excluded.validation_status,
      validation_errors_json = excluded.validation_errors_json,
      created_by_user_id = excluded.created_by_user_id,
      created_at = excluded.created_at;
  `);

  const listStorefrontConfigs = database.prepare(`
    SELECT
      id,
      source_draft_key AS sourceDraftKey,
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
      source_draft_key AS sourceDraftKey,
      config_json AS configJson,
      validation_status AS validationStatus,
      validation_errors_json AS validationErrorsJson,
      created_by_user_id AS createdByUserId,
      created_at AS createdAt
    FROM storefront_configs
    WHERE id = ?;
  `);

  const deleteStorefrontConfig = database.prepare(`
    DELETE FROM storefront_configs
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

  function parseCodexRunRow(row: {
    id: string;
    question: string;
    createdByUserId: string;
    createdAt: string;
  }): CodexRun {
    return {
      id: row.id,
      question: row.question,
      createdByUserId: row.createdByUserId,
      createdAt: new Date(row.createdAt),
    };
  }

  function parseStorefrontConfigRow(row: {
    id: string;
    sourceDraftKey: string;
    configJson: string;
    validationStatus: GeneratedStorefrontConfig["validationStatus"];
    validationErrorsJson: string;
    createdByUserId: string;
    createdAt: string;
  }): GeneratedStorefrontConfig {
    return {
      id: row.id,
      sourceDraftKey: row.sourceDraftKey,
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
    const defaultComposition = {
      slot: "storefrontHeroWide",
      aspectRatio: "14 / 9",
      focalPoint: "right-center",
      safeArea: "copy-left-half",
      objectPosition: "72% center",
    } as const;

    return hydrateLegacyStorefrontSectionIntents({
      ...config,
      visualAsset: config.visualAsset
        ? {
            ...config.visualAsset,
            composition: {
              ...defaultComposition,
              ...config.visualAsset.composition,
            },
          }
        : fallbackVisualAssetFor(config),
    });
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
        composition: {
          slot: "storefrontHeroWide",
          aspectRatio: "14 / 9",
          focalPoint: "right-center",
          safeArea: "copy-left-half",
          objectPosition: "72% center",
        },
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
        composition: {
          slot: "storefrontHeroWide",
          aspectRatio: "14 / 9",
          focalPoint: "right-center",
          safeArea: "copy-left-half",
          objectPosition: "72% center",
        },
      };
    }

    return {
      id: "evergreen-hero-asset",
      campaignId: config.campaignId,
      prompt:
        "Bright Atlas & Co. tabletop hero with coffee, desk, and travel essentials in a clean everyday retail style.",
      alt: "A bright Atlas & Co. tabletop scene with coffee gear, a desk lamp, and everyday gift essentials.",
      source: "static",
      path: "/static-assets/basic-hero.svg",
      composition: {
        slot: "storefrontHeroWide",
        aspectRatio: "14 / 9",
        focalPoint: "right-center",
        safeArea: "copy-left-half",
        objectPosition: "72% center",
      },
    };
  }

  return {
    close() {
      database.close();
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
    saveStorefrontConfig(storefrontConfig) {
      insertStorefrontConfig.run(
        storefrontConfig.id,
        storefrontConfig.sourceDraftKey,
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
    deleteStorefrontConfig(id) {
      deleteStorefrontConfig.run(id);
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
    listRecentCodexRuns(limit = 10) {
      const rows = listRecentCodexRuns.all(limit) as Array<Parameters<typeof parseCodexRunRow>[0]>;

      return rows.map(parseCodexRunRow);
    },
    listCodexRunEvents(runId) {
      const rows = listCodexRunEvents.all(runId) as Array<
        Parameters<typeof parseCodexRunEventRow>[0]
      >;

      return rows.map(parseCodexRunEventRow);
    },
  };
}
