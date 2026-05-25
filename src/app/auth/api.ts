import { getCurrentUser } from "@/app/auth/session";
import { AuthorizationError, requirePermission } from "@/domain/auth";
import type { Permission } from "@/domain/roles";
import type { AuthenticatedUser } from "@/domain/users";

export type ApiAuthorizationResult =
  | { response: Response; user?: never }
  | { response?: never; user: AuthenticatedUser };

export async function authorizeApiRequest(permission: Permission): Promise<ApiAuthorizationResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { response: jsonError("Authentication required.", 401) };
  }

  try {
    requirePermission(user, permission);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { response: jsonError("Permission denied.", 403) };
    }

    throw error;
  }

  return { user };
}

export function assertSameOriginJsonRequest(request: Request): Response | null {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonError("Expected application/json request body.", 415);
  }

  const origin = request.headers.get("origin");

  if (origin && origin !== new URL(request.url).origin) {
    return jsonError("Cross-origin requests are not allowed.", 403);
  }

  return null;
}

function jsonError(error: string, status: number): Response {
  return Response.json({ error }, { status });
}
