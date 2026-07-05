/**
 * Injected system-field generators shared by every `build*Movement`. Kept as a
 * factory so screens don't each inline the same object, and so the id/user/clock
 * sources live in one place. Structurally matches each view-model's `*Deps`.
 */
export interface MovementDeps {
  id: () => string;
  userId: () => string;
  now: () => string; // ISO timestamp for createdAt
}

/** Default deps for the local mock store (no backend yet). */
export function defaultMovementDeps(): MovementDeps {
  return {
    id: () => `local-${Date.now()}`,
    userId: () => "mock-user-001",
    now: () => new Date().toISOString(),
  };
}
