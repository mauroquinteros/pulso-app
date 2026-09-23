const PENDING_APPLE_NAME_PREFIX = "pulso-pending-apple-name:";

export interface AppleProfileNameDependencies {
  read: (key: string) => Promise<string | null>;
  write: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
  update: (fullName: string) => Promise<boolean>;
}

export function pendingAppleNameKey(userId: string): string {
  return `${PENDING_APPLE_NAME_PREFIX}${userId}`;
}

/**
 * Apple normally returns the name once. A failed metadata write therefore gets
 * one immediate retry and remains on-device for later attempts. None of these
 * failures can invalidate the session that was already created.
 */
export async function syncAppleProfileNameAfterSignIn(
  userId: string,
  existingName: string,
  appleName: string,
  dependencies: AppleProfileNameDependencies,
): Promise<void> {
  const fullName = appleName.trim();
  const key = pendingAppleNameKey(userId);

  if (existingName.trim()) {
    await ignoreFailure(() => dependencies.remove(key));
    return;
  }

  if (!fullName) return;

  if (await attemptUpdate(fullName, dependencies)) {
    await ignoreFailure(() => dependencies.remove(key));
    return;
  }

  await ignoreFailure(() => dependencies.write(key, fullName));

  if (await attemptUpdate(fullName, dependencies)) {
    await ignoreFailure(() => dependencies.remove(key));
  }
}

/** Retries a name saved by a previous sign-in without overwriting later edits. */
export async function retryPendingAppleProfileName(
  userId: string,
  existingName: string,
  dependencies: AppleProfileNameDependencies,
): Promise<void> {
  const key = pendingAppleNameKey(userId);

  if (existingName.trim()) {
    await ignoreFailure(() => dependencies.remove(key));
    return;
  }

  const pendingName = await readPendingName(key, dependencies);
  if (!pendingName) return;

  if (await attemptUpdate(pendingName, dependencies)) {
    await ignoreFailure(() => dependencies.remove(key));
  }
}

async function readPendingName(key: string, dependencies: AppleProfileNameDependencies): Promise<string | null> {
  try {
    const value = (await dependencies.read(key))?.trim();
    return value || null;
  } catch {
    return null;
  }
}

async function attemptUpdate(fullName: string, dependencies: AppleProfileNameDependencies): Promise<boolean> {
  try {
    return await dependencies.update(fullName);
  } catch {
    return false;
  }
}

async function ignoreFailure(operation: () => Promise<void>): Promise<void> {
  try {
    await operation();
  } catch {
    // The session is already valid. Storage cleanup is best-effort and will be
    // attempted again when the app next becomes active.
  }
}
