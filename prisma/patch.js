/* eslint-disable @typescript-eslint/no-require-imports */
const Database = require("better-sqlite3");

const db = new Database("prisma/dev.db");

function hasColumn(tableName, columnName) {
  const rows = db.prepare(`PRAGMA table_info("${tableName}")`).all();
  return rows.some((row) => row.name === columnName);
}

if (!hasColumn("Product", "subCategory")) {
  db.prepare(`ALTER TABLE "Product" ADD COLUMN "subCategory" TEXT`).run();
}
