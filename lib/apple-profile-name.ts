import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import {
  retryPendingAppleProfileName as retryPendingName,
  syncAppleProfileNameAfterSignIn as syncNameAfterSignIn,
  type AppleProfileNameDependencies,
} from "@/utils/apple-profile-name";

const dependencies: AppleProfileNameDependencies = {
  read: (key) => AsyncStorage.getItem(key),
  write: (key, value) => AsyncStorage.setItem(key, value),
  remove: (key) => AsyncStorage.removeItem(key),
  update: async (fullName) => {
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    return !error;
  },
};

const pendingByUser = new Map<string, Promise<void>>();

export function syncAppleProfileNameAfterSignIn(user: User, appleName: string): Promise<void> {
  return runSeriallyForUser(user.id, () => syncNameAfterSignIn(user.id, profileNameOf(user), appleName, dependencies));
}

export function retryPendingAppleProfileName(user: User): Promise<void> {
  return runSeriallyForUser(user.id, () => retryPendingName(user.id, profileNameOf(user), dependencies));
}

function profileNameOf(user: User): string {
  const fullName = user.user_metadata.full_name;
  if (typeof fullName === "string" && fullName.trim()) return fullName;

  const name = user.user_metadata.name;
  return typeof name === "string" ? name : "";
}

function runSeriallyForUser(userId: string, operation: () => Promise<void>): Promise<void> {
  const previous = pendingByUser.get(userId) ?? Promise.resolve();
  const running = previous
    .catch(() => {})
    .then(operation)
    .finally(() => {
      if (pendingByUser.get(userId) === running) {
        pendingByUser.delete(userId);
      }
    });

  pendingByUser.set(userId, running);
  return running;
}
