import { authenticate, createSession, normalizeEmail } from "@/server/auth";
import { assertSameOrigin, clearRateLimit, clientKey, handle, json, rateLimit, readBody, sessionCookie } from "@/server/http";
import { currentState } from "@/server/stateRepo";
import { parseCredentials } from "@/server/validate";

export function POST(request: Request): Promise<Response> {
  return handle(async () => {
    assertSameOrigin(request);
    const input = parseCredentials(await readBody(request));
    const key = `login:${clientKey(request)}:${normalizeEmail(input.email)}`;
    rateLimit(key, 8);
    const user = authenticate(input.email, input.password);
    clearRateLimit(key);
    const session = createSession(user.id);
    return json({ user, ...currentState(user.id) }, { headers: { "Set-Cookie": sessionCookie(request, session.token) } });
  });
}
