import { changePassword, deleteUser } from "@/server/auth";
import { assertSameOrigin, clearedCookie, handle, json, readBody, readToken, requireUser } from "@/server/http";
import { cancel } from "@/server/stateRepo";
import { parseFields } from "@/server/validate";

export function PATCH(request: Request): Promise<Response> {
  return handle(async () => {
    assertSameOrigin(request);
    const user = requireUser(request);
    const input = parseFields<{ currentPassword: string; newPassword: string }>(await readBody(request), ["currentPassword", "newPassword"]);
    changePassword(user.id, input.currentPassword, input.newPassword, readToken(request));
    return json({ ok: true });
  });
}

export function DELETE(request: Request): Promise<Response> {
  return handle(async () => {
    assertSameOrigin(request);
    const user = requireUser(request);
    const input = parseFields<{ password: string }>(await readBody(request), ["password"]);
    deleteUser(user.id, input.password);
    cancel(user.id);
    return json({ ok: true }, { headers: { "Set-Cookie": clearedCookie(request) } });
  });
}
