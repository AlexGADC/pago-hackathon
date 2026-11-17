import { createSession, createUser } from "@/server/auth";
import { assertSameOrigin, clientKey, handle, json, rateLimit, readBody, sessionCookie } from "@/server/http";
import { loadState } from "@/server/stateRepo";
import { parseCredentials } from "@/server/validate";

export function POST(request: Request): Promise<Response> {
  return handle(async () => {
    assertSameOrigin(request);
    rateLimit(`register:${clientKey(request)}`, 10);
    const input = parseCredentials(await readBody(request));
    const user = createUser(input);
    const envelope = loadState(user.id);
    const session = createSession(user.id);
    return json({ user, ...envelope }, { status: 201, headers: { "Set-Cookie": sessionCookie(request, session.token) } });
  });
}
