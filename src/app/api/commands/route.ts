import { assertSameOrigin, handle, json, rateLimit, readBody, requireUser } from "@/server/http";
import { runCommand } from "@/server/stateRepo";
import { parseCommand } from "@/server/validate";

export function POST(request: Request): Promise<Response> {
  return handle(async () => {
    assertSameOrigin(request);
    const user = requireUser(request);
    rateLimit(`commands:${user.id}`, 3000);
    return json(runCommand(user.id, parseCommand(await readBody(request))));
  });
}
