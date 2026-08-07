import { GoogleSignin, isSuccessResponse } from "@react-native-google-signin/google-signin";

GoogleSignin.configure({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT,
});

/**
 * What a sign-in attempt can come back as. Three outcomes rather than a token or
 * null, because the screen has to say something different for each: silence for
 * a dismissal, one message for no connection, another for everything else.
 */
export type GoogleSignInResult =
  | { outcome: "token"; idToken: string }
  | { outcome: "cancelled" }
  | { outcome: "offline" }
  | { outcome: "failed" };

/**
 * The only file in the app that imports the native Google module. Everything
 * above this seam deals in the union above, which is what lets the sign-in
 * screen's state machine stay pure and testable.
 *
 * Nothing throws out of here. A thrown native error would make the caller
 * responsible for classifying it, and classifying native errors is exactly the
 * job this seam exists to absorb.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  try {
    // A no-op on iOS, called unconditionally by the library's own convention.
    await GoogleSignin.hasPlayServices();

    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      return { outcome: "cancelled" };
    }

    // Success without a token should not happen with `iosClientId` configured,
    // but the type admits it and an empty token would fail confusingly one layer
    // up, at Supabase, as a rejected credential rather than a missing one.
    return response.data.idToken ? { outcome: "token", idToken: response.data.idToken } : { outcome: "failed" };
  } catch (error) {
    // The library publishes no status code for "no connection" - `statusCodes`
    // covers cancellation, Play Services and sign-in-required, and nothing else
    // - so there is no code to match on here. Offline is classified where it can
    // be: on the Supabase exchange, which reports it as a retryable fetch error.
    return { outcome: isNetworkError(error) ? "offline" : "failed" };
  }
}

/**
 * The native side gives us a message, not a code. Matching on it is a heuristic
 * and deliberately biased towards `failed`: a network problem shown as a generic
 * error is a worse message, while a generic problem shown as "check your
 * internet" sends someone to fix a connection that was never broken.
 */
function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /network|internet|offline|connection/i.test(error.message);
}
