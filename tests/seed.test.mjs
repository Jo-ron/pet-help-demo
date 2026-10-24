import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createServer } from "../server/index.mjs";

const directory = mkdtempSync(join(tmpdir(), "pet-help-seed-"));
const databasePath = join(directory, "pet-help.sqlite");

function counts() {
  const db = new DatabaseSync(databasePath);
  const result = {
    find: db.prepare("SELECT COUNT(*) AS count FROM find_posts").get().count,
    help: db.prepare("SELECT COUNT(*) AS count FROM help_posts").get().count,
    goods: db.prepare("SELECT COUNT(*) AS count FROM goods_posts").get().count
  };
  db.close();
  return result;
}

after(() => rmSync(directory, { recursive: true, force: true }));

test("file-backed database seeds demo content and stays idempotent", () => {
  const first = createServer({ databasePath });
  first.close();
  const seeded = counts();
  assert.ok(seeded.find >= 3, "expected at least 3 seeded find posts");
  assert.ok(seeded.help >= 3, "expected at least 3 seeded help posts");
  assert.ok(seeded.goods >= 6, "expected at least 6 seeded goods posts");

  const second = createServer({ databasePath });
  second.close();
  assert.deepEqual(counts(), seeded, "restarting against the same file must not duplicate seed data");
});
