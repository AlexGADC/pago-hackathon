import { userForToken } from "@/server/auth";
import { handle, json, readToken } from "@/server/http";
import { currentState } from "@/server/stateRepo";

export function GET(request: Request): Promise<Response> {
  return handle(() => {
    const user = userForToken(readToken(request));
    if (!user) return json({ user: null });
    return json({ user, ...currentState(user.id) });
  });
}
