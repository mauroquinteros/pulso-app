import * as Crypto from "expo-crypto";

/**
 * The system fields a form injects into its `build*Movement`. The id alone now:
 * `createdAt` is read from the database's clock when the row is stored, so a
 * form no longer supplies one (ADR 0010).
 *
 * One value per **form session, not per tap**. `id()` hands back the same UUID
 * however many times it is called, so a save retried after a lost response
 * carries the id the first attempt used and Postgres rejects the duplicate
 * rather than recording a second Movement. That is what makes ADR 0010's
 * retry-safety real rather than claimed - which is why screens hold the deps in
 * state instead of building them inside the save handler.
 */
export interface MovementDeps {
  id: () => string;
}

export function defaultMovementDeps(): MovementDeps {
  // All three `id` columns are `uuid NOT NULL` with no default, so the client
  // supplies one (ADR 0006). Expo's runtime polyfills `fetch`, `URL`,
  // `FormData` and `TextDecoder` but not `crypto`, so there is no global
  // `randomUUID` to reach for and `expo-crypto` is the source.
  const id = Crypto.randomUUID();

  return { id: () => id };
}
