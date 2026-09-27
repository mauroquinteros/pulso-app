import type { User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { deletePerfil, type DeletePerfilDependencies } from "./delete-perfil";

const appleUser = {
  id: "perfil-1",
  app_metadata: { provider: "apple", providers: ["apple"] },
  identities: [{ provider: "apple" }],
} as User;

describe("deletePerfil", () => {
  it("reauthorizes Apple, deletes remotely, and then clears local data", async () => {
    const dependencies: DeletePerfilDependencies = {
      reauthorizeApple: vi.fn(async () => ({ outcome: "authorized" as const, authorizationCode: "apple-code" })),
      deleteRemotely: vi.fn(async () => true),
      clearLocalData: vi.fn(async () => true),
    };

    await expect(deletePerfil(appleUser, dependencies)).resolves.toBe("deleted");
    expect(dependencies.deleteRemotely).toHaveBeenCalledWith("apple-code");
    expect(dependencies.clearLocalData).toHaveBeenCalledWith("perfil-1");
  });

  it("reports a local cleanup failure after the remote deletion succeeded", async () => {
    const dependencies: DeletePerfilDependencies = {
      reauthorizeApple: vi.fn(async () => ({ outcome: "authorized" as const, authorizationCode: "apple-code" })),
      deleteRemotely: vi.fn(async () => true),
      clearLocalData: vi.fn(async () => {
        throw new Error("storage unavailable");
      }),
    };

    await expect(deletePerfil(appleUser, dependencies)).resolves.toBe("deletedLocalCleanupFailed");
  });
});
