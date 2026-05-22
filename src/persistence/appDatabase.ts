import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { products } from "@/fixtures/products";
import { demoUsers } from "@/fixtures/users";
import { type CommerceDatabase, createCommerceDatabase } from "@/persistence/database";

const databasePath = join(process.cwd(), ".data", "commerce.db");

let database: CommerceDatabase | null = null;

export function getAppDatabase(): CommerceDatabase {
  if (!database) {
    mkdirSync(dirname(databasePath), { recursive: true });
    database = createCommerceDatabase(databasePath);
    database.seedProducts(products);
    database.seedUsers(demoUsers);
  }

  return database;
}
