import { getDb } from "@/server/db";
import { handle, json } from "@/server/http";

export function GET(request: Request): Promise<Response> {
  return handle(() => {
    const row = getDb().prepare("SELECT COUNT(*) AS users FROM users").get() as { users: number };
    return json({ ok: true, users: row.users, host: request.headers.get("host") });
  });
}
