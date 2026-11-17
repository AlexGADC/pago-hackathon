import { destroySession } from "@/server/auth";
import { assertSameOrigin, clearedCookie, handle, json, readToken } from "@/server/http";

export function POST(request: Request): Promise<Response> {
  return handle(() => {
    assertSameOrigin(request);
    destroySession(readToken(request));
    return json({ ok: true }, { headers: { "Set-Cookie": clearedCookie(request) } });
  });
}
