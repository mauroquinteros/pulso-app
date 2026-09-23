import * as AppleAuthentication from "expo-apple-authentication";

export type AppleSignInResult =
  | { outcome: "token"; idToken: string; fullName: string | null }
  | { outcome: "cancelled" }
  | { outcome: "offline" }
  | { outcome: "failed" };

/** The only module that asks iOS for an Apple credential. */
export async function signInWithApple(): Promise<AppleSignInResult> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { outcome: "failed" };
    }

    const formattedName = credential.fullName ? AppleAuthentication.formatFullName(credential.fullName).trim() : "";

    return {
      outcome: "token",
      idToken: credential.identityToken,
      fullName: formattedName || null,
    };
  } catch (error) {
    if (isAppleCancellation(error)) {
      return { outcome: "cancelled" };
    }

    return { outcome: isNetworkError(error) ? "offline" : "failed" };
  }
}

function isAppleCancellation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ERR_REQUEST_CANCELED";
}

function isNetworkError(error: unknown): boolean {
  return error instanceof Error && /network|internet|offline|connection/i.test(error.message);
}
