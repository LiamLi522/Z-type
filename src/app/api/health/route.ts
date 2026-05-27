const requiredTables = [
  "profiles",
  "copybooks",
  "font_preferences",
  "notification_preferences",
  "ai_font_jobs",
  "subscriptions",
];

type TableStatus = {
  table: string;
  ok: boolean;
  status?: number;
  code?: string;
  message?: string;
};

async function checkSupabaseTables(): Promise<{
  configured: boolean;
  ready: boolean;
  host?: string;
  tables: TableStatus[];
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      configured: false,
      ready: false,
      tables: [],
    };
  }

  const tables = await Promise.all(
    requiredTables.map(async (table): Promise<TableStatus> => {
      const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        cache: "no-store",
      });
      const body = await response.text();

      let payload: { code?: string; message?: string } | undefined;
      try {
        payload = body ? (JSON.parse(body) as { code?: string; message?: string }) : undefined;
      } catch {
        payload = undefined;
      }

      return {
        table,
        ok: response.ok,
        status: response.status,
        code: payload?.code,
        message: payload?.message,
      };
    }),
  );

  return {
    configured: true,
    ready: tables.every((table) => table.ok),
    host: new URL(supabaseUrl).host,
    tables,
  };
}

export async function GET() {
  const database = await checkSupabaseTables();

  return Response.json(
    {
      ok: database.ready,
      app: "z-type",
      database,
      timestamp: new Date().toISOString(),
    },
    {
      status: database.ready ? 200 : 503,
    },
  );
}
