import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const requiredTables = [
  "profiles",
  "copybooks",
  "font_preferences",
  "notification_preferences",
  "ai_font_jobs",
  "subscriptions",
];

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) return;

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function getSupabaseEnv() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  return {
    apiUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    dbUrl: process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL,
  };
}

async function checkDatabase() {
  const { apiUrl, anonKey } = getSupabaseEnv();
  if (!apiUrl || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const results = [];
  for (const table of requiredTables) {
    const response = await fetch(`${apiUrl}/rest/v1/${table}?select=*&limit=1`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
    const body = await response.text();
    let payload;
    try {
      payload = body ? JSON.parse(body) : undefined;
    } catch {
      payload = undefined;
    }

    results.push({
      table,
      ok: response.ok,
      status: response.status,
      code: payload?.code,
      message: payload?.message,
    });
  }

  const missing = results.filter((item) => !item.ok);
  console.table(results);

  if (missing.length > 0) {
    throw new Error(`Missing or inaccessible tables: ${missing.map((item) => item.table).join(", ")}`);
  }

  console.log(`Supabase schema is reachable at ${new URL(apiUrl).host}.`);
}

async function applySchema() {
  const { dbUrl } = getSupabaseEnv();
  if (!dbUrl) {
    throw new Error("Missing SUPABASE_DB_URL or DATABASE_URL. Use the Supabase project database connection string.");
  }

  const { Client } = await import("pg");
  const sql = readFileSync(resolve(process.cwd(), "supabase/schema.sql"), "utf8");
  const isLocal = /localhost|127\.0\.0\.1/.test(dbUrl);
  const client = new Client({
    connectionString: dbUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }

  console.log("Supabase schema applied successfully.");
}

const command = process.argv[2] ?? "check";

try {
  if (command === "check") {
    await checkDatabase();
  } else if (command === "setup") {
    await applySchema();
    await checkDatabase();
  } else {
    throw new Error(`Unknown command "${command}". Use "check" or "setup".`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
