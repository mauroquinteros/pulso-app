import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@supabase/supabase-js";

import { signInWithApple } from "@/lib/apple-sign-in";
import { forgetLocalSession } from "@/lib/sign-out";
import { supabase } from "@/lib/supabase";
import { deletePerfil as coordinateDeletion, type DeletePerfilDependencies } from "@/utils/delete-perfil";
import { pendingAppleNameKey } from "@/utils/apple-profile-name";

interface DeletePerfilResponse {
  deleted?: boolean;
}

const dependencies: DeletePerfilDependencies = {
  reauthorizeApple: async () => {
    const result = await signInWithApple();
    if (result.outcome === "cancelled") return { outcome: "cancelled" };
    if (result.outcome !== "token" || !result.authorizationCode) return { outcome: "failed" };
    return { outcome: "authorized", authorizationCode: result.authorizationCode };
  },
  deleteRemotely: async (authorizationCode) => {
    try {
      const { data, error } = await supabase.functions.invoke<DeletePerfilResponse>("delete-profile", {
        body: authorizationCode ? { authorizationCode } : {},
      });
      return !error && data?.deleted === true;
    } catch {
      return false;
    }
  },
  clearLocalData: async (userId) => {
    await AsyncStorage.removeItem(pendingAppleNameKey(userId)).catch(() => {});
    return forgetLocalSession();
  },
};

export function deleteCurrentPerfil(user: User) {
  return coordinateDeletion(user, dependencies);
}
