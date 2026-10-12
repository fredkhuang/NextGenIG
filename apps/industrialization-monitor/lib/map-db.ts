import "server-only";
import postgres from "postgres";

// Read-only connection for the public map: the `map_reader` login can SELECT map.sites and nothing
// else (supabase/migrations/*_map_reader.sql). Transaction-mode pooler, so no prepared statements.
let sql: postgres.Sql | null = null;

export function mapDb() {
  const url = process.env.MAP_DATABASE_URL;
  if (!url) throw new Error("MAP_DATABASE_URL is not configured");
  sql ??= postgres(url, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10 });
  return sql;
}
