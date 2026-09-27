import type { User } from "@supabase/supabase-js";

export type AppleReauthorization =
  | { outcome: "authorized"; authorizationCode: string }
  | { outcome: "cancelled" }
  | { outcome: "failed" };

export type DeletePerfilResult = "deleted" | "deletedLocalCleanupFailed" | "cancelled" | "failed";

export interface DeletePerfilDependencies {
  reauthorizeApple: () => Promise<AppleReauthorization>;
  deleteRemotely: (authorizationCode: string | null) => Promise<boolean>;
  clearLocalData: (userId: string) => Promise<boolean>;
}

/** Coordinates the irreversible operation without owning UI or infrastructure. */
export async function deletePerfil(user: User, dependencies: DeletePerfilDependencies): Promise<DeletePerfilResult> {
  let authorizationCode: string | null = null;

  if (hasAppleIdentity(user)) {
    const authorization = await dependencies.reauthorizeApple();
    if (authorization.outcome !== "authorized") return authorization.outcome;
    authorizationCode = authorization.authorizationCode;
  }

  if (!(await dependencies.deleteRemotely(authorizationCode))) return "failed";

  try {
    return (await dependencies.clearLocalData(user.id)) ? "deleted" : "deletedLocalCleanupFailed";
  } catch {
    return "deletedLocalCleanupFailed";
  }
}

function hasAppleIdentity(user: User): boolean {
  return (
    user.identities?.some((identity) => identity.provider === "apple") === true ||
    user.app_metadata.providers?.includes("apple") === true
  );
}
