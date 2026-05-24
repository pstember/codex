import { scryptSync } from "node:crypto";
import { mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite");

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const fixturePath = join(projectRoot, "fixtures", "commerce.db");

const demoStaffPasswords = {
  manager: "manager-demo-pass",
  analyst: "analyst-demo-pass",
  operator: "operator-demo-pass",
};

const demoUsers = [
  {
    id: "demo-manager",
    email: "manager@demo.com",
    name: "Mara Chen",
    role: "manager",
    passwordHash: hashStaffPassword(demoStaffPasswords.manager, "demo-manager-salt"),
  },
  {
    id: "demo-analyst",
    email: "analyst@demo.com",
    name: "Ari Singh",
    role: "analyst",
    passwordHash: hashStaffPassword(demoStaffPasswords.analyst, "demo-analyst-salt"),
  },
  {
    id: "demo-operator",
    email: "operator@demo.com",
    name: "Owen Patel",
    role: "operator",
    passwordHash: hashStaffPassword(demoStaffPasswords.operator, "demo-operator-salt"),
  },
];

mkdirSync(dirname(fixturePath), { recursive: true });
rmSync(fixturePath, { force: true });

const database = new DatabaseSync(fixturePath);

database.exec(`
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    password_hash TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    expires_at TEXT NOT NULL
  );

  CREATE TABLE storefront_configs (
    id TEXT PRIMARY KEY,
    source_draft_key TEXT NOT NULL,
    config_json TEXT NOT NULL,
    validation_status TEXT NOT NULL,
    validation_errors_json TEXT NOT NULL,
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE published_storefront_versions (
    id TEXT PRIMARY KEY,
    source_storefront_config_id TEXT NOT NULL,
    config_json TEXT NOT NULL,
    status TEXT NOT NULL,
    rollback_of_version_id TEXT,
    published_by_user_id TEXT NOT NULL,
    published_at TEXT NOT NULL
  );

  CREATE TABLE codex_runs (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE codex_run_events (
    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL REFERENCES codex_runs(id),
    stage TEXT NOT NULL,
    message TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    payload_json TEXT NOT NULL DEFAULT '{}'
  );

  CREATE INDEX codex_run_events_order_idx
    ON codex_run_events (run_id, occurred_at, sequence);
`);

const insertUser = database.prepare(`
  INSERT INTO users (id, email, name, role, password_hash)
  VALUES (?, ?, ?, ?, ?);
`);

database.exec("BEGIN");
try {
  for (const user of demoUsers) {
    insertUser.run(user.id, user.email, user.name, user.role, user.passwordHash);
  }

  database.exec("COMMIT");
} catch (error) {
  database.exec("ROLLBACK");
  throw error;
} finally {
  database.close();
}

console.log(`Wrote clean fixture database to ${fixturePath}`);

function hashStaffPassword(password, salt) {
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
