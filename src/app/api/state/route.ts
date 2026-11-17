import { assertSameOrigin, handle, json, requireUser } from "@/server/http";
import { currentState, resetState } from "@/server/stateRepo";

export function GET(request: Request): Promise<Response> {
  return handle(() => json(currentState(requireUser(request).id)));
}

export function DELETE(request: Request): Promise<Response> {
  return handle(() => {
    assertSameOrigin(request);
    return json(resetState(requireUser(request).id));
  });
}
