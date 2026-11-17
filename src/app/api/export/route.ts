import { handle, json, requireUser } from "@/server/http";
import { listActivity, listPayments, loadState } from "@/server/stateRepo";

export function GET(request: Request): Promise<Response> {
  return handle(() => {
    const user = requireUser(request);
    const { state, revision } = loadState(user.id);
    return json({ user, revision, state, payments: listPayments(user.id), activity: listActivity(user.id, 200) });
  });
}
