import { GoogleSignin, isSuccessResponse } from "@react-native-google-signin/google-signin";

GoogleSignin.configure({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT,
});

/**
 * The only file in the app that imports the native Google module. Everything
 * above this seam deals in a plain id token, which is what lets the sign-in
 * screen's state machine stay pure and testable.
 *
 * Returns the id token, or `null` when the human dismissed the sheet.
 */
export async function signInWithGoogle(): Promise<string | null> {
  // A no-op on iOS, called unconditionally by the library's own convention.
  await GoogleSignin.hasPlayServices();

  const response = await GoogleSignin.signIn();

  return isSuccessResponse(response) ? response.data.idToken : null;
}
