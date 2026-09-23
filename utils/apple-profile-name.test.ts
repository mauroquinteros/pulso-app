import { describe, expect, it, vi } from "vitest";

import {
  pendingAppleNameKey,
  retryPendingAppleProfileName,
  syncAppleProfileNameAfterSignIn,
  type AppleProfileNameDependencies,
} from "./apple-profile-name";

function dependencies(options?: {
  storedName?: string | null;
  updateResults?: boolean[];
  writeFails?: boolean;
}): AppleProfileNameDependencies & { values: Map<string, string> } {
  const values = new Map<string, string>();
  if (options?.storedName !== undefined && options.storedName !== null) {
    values.set(pendingAppleNameKey("perfil-1"), options.storedName);
  }

  const updateResults = [...(options?.updateResults ?? [])];

  return {
    values,
    read: vi.fn(async (key) => values.get(key) ?? null),
    write: vi.fn(async (key, value) => {
      if (options?.writeFails) throw new Error("storage unavailable");
      values.set(key, value);
    }),
    remove: vi.fn(async (key) => {
      values.delete(key);
    }),
    update: vi.fn(async () => updateResults.shift() ?? false),
  };
}

describe("syncAppleProfileNameAfterSignIn", () => {
  it("does nothing when the Perfil already has a name", async () => {
    const deps = dependencies();

    await syncAppleProfileNameAfterSignIn("perfil-1", "Nombre existente", "Nombre de Apple", deps);

    expect(deps.update).not.toHaveBeenCalled();
    expect(deps.write).not.toHaveBeenCalled();
  });

  it("updates once and stores nothing when the first attempt succeeds", async () => {
    const deps = dependencies({ updateResults: [true] });

    await syncAppleProfileNameAfterSignIn("perfil-1", "", "Mauro Quinteros", deps);

    expect(deps.update).toHaveBeenCalledTimes(1);
    expect(deps.write).not.toHaveBeenCalled();
    expect(deps.values.size).toBe(0);
  });

  it("persists the name before an immediate second attempt", async () => {
    const deps = dependencies({ updateResults: [false, true] });

    await syncAppleProfileNameAfterSignIn("perfil-1", "", "Mauro Quinteros", deps);

    expect(deps.update).toHaveBeenCalledTimes(2);
    expect(deps.write).toHaveBeenCalledWith(pendingAppleNameKey("perfil-1"), "Mauro Quinteros");
    expect(deps.values.size).toBe(0);
  });

  it("keeps the pending name when both attempts fail", async () => {
    const deps = dependencies({ updateResults: [false, false] });

    await syncAppleProfileNameAfterSignIn("perfil-1", "", "Mauro Quinteros", deps);

    expect(deps.values.get(pendingAppleNameKey("perfil-1"))).toBe("Mauro Quinteros");
  });

  it("still performs the immediate retry when storage is unavailable", async () => {
    const deps = dependencies({ updateResults: [false, true], writeFails: true });

    await expect(syncAppleProfileNameAfterSignIn("perfil-1", "", "Mauro Quinteros", deps)).resolves.toBeUndefined();
    expect(deps.update).toHaveBeenCalledTimes(2);
  });
});

describe("retryPendingAppleProfileName", () => {
  it("writes a pending name and clears it after success", async () => {
    const deps = dependencies({ storedName: "Mauro Quinteros", updateResults: [true] });

    await retryPendingAppleProfileName("perfil-1", "", deps);

    expect(deps.update).toHaveBeenCalledWith("Mauro Quinteros");
    expect(deps.values.size).toBe(0);
  });

  it("clears stale pending data instead of overwriting an existing name", async () => {
    const deps = dependencies({ storedName: "Nombre de Apple" });

    await retryPendingAppleProfileName("perfil-1", "Nombre elegido", deps);

    expect(deps.update).not.toHaveBeenCalled();
    expect(deps.values.size).toBe(0);
  });
});
