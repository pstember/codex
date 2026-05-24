import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { demoUsers } from "@/fixtures/users";
import { type CommerceDatabase, createCommerceDatabase } from "@/persistence/database";

const databasePath =
  process.env.COMMERCE_DATABASE_PATH ?? join(process.cwd(), ".data", "commerce.db");

let database: CommerceDatabase | null = null;

export function getAppDatabase(): CommerceDatabase {
  if (!database) {
    if (databasePath !== ":memory:") {
      mkdirSync(dirname(databasePath), { recursive: true });
    }
    database = createCommerceDatabase(databasePath);
    database.seedUsers(demoUsers);
  }

  return database;
}
