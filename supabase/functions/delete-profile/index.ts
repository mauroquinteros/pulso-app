// delete-profile -- revokes Sign in with Apple when the authenticated Perfil has
// an Apple identity, then hard-deletes that Perfil from Supabase Auth. The
// movement tables and user_stocks reference auth.users with ON DELETE CASCADE,
// so deleting the Auth user is the one write that removes everything it owns.
//
// The request never accepts a user id. Its bearer token identifies the Perfil;
// accepting an id from the body would let a caller ask to delete somebody else.
//
// Secrets to set: APPLE_PRIVATE_KEY, APPLE_KEY_ID, APPLE_TEAM_ID,
// APPLE_CLIENT_ID. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by
// Supabase.

import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";

const APPLE_PRIVATE_KEY = Deno.env.get("APPLE_PRIVATE_KEY")!;
const APPLE_KEY_ID = Deno.env.get("APPLE_KEY_ID")!;
const APPLE_TEAM_ID = Deno.env.get("APPLE_TEAM_ID")!;
const APPLE_CLIENT_ID = Deno.env.get("APPLE_CLIENT_ID")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface AppleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  error?: string;
}

interface JwtPayload {
  sub?: string;
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
}

async function signedInUser(request: Request, supabase: SupabaseClient): Promise<User | null> {
  const token = bearerToken(request);
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data.user;
}

function appleIdentityOf(user: User) {
  return user.identities?.find((identity) => identity.provider === "apple") ?? null;
}

function hasAppleIdentity(user: User): boolean {
  return appleIdentityOf(user) !== null || user.app_metadata.providers?.includes("apple") === true;
}

function appleSubjectOf(user: User): string | null {
  const subject = appleIdentityOf(user)?.identity_data?.sub;
  return typeof subject === "string" && subject ? subject : null;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function encodedJson(value: object): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function privateKeyBytes(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer as ArrayBuffer;
}

async function createAppleClientSecret(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = encodedJson({ alg: "ES256", kid: APPLE_KEY_ID });
  const payload = encodedJson({
    iss: APPLE_TEAM_ID,
    iat: now,
    exp: now + 300,
    aud: "https://appleid.apple.com",
    sub: APPLE_CLIENT_ID,
  });
  const unsigned = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes(APPLE_PRIVATE_KEY),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsigned),
  );

  return `${unsigned}.${base64Url(new Uint8Array(signature))}`;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const encoded = token.split(".")[1];
  if (!encoded) return null;

  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

async function exchangeAuthorizationCode(code: string, clientSecret: string): Promise<AppleTokenResponse | null> {
  const response = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: APPLE_CLIENT_ID,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });
  const body = (await response.json()) as AppleTokenResponse;
  return response.ok && !body.error ? body : null;
}

async function revokeAppleToken(token: string, clientSecret: string, tokenType: "access_token" | "refresh_token") {
  const response = await fetch("https://appleid.apple.com/auth/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: APPLE_CLIENT_ID,
      client_secret: clientSecret,
      token,
      token_type_hint: tokenType,
    }),
  });
  return response.ok;
}

Deno.serve(async (request) => {
  console.log(JSON.stringify({ event: "delete_profile_started" }));

  if (request.method !== "POST") {
    console.warn(JSON.stringify({ event: "delete_profile_failed", error: "method_not_allowed", status: 405 }));
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const user = await signedInUser(request, supabase);
  if (!user) {
    console.warn(JSON.stringify({ event: "delete_profile_failed", error: "unauthorized", status: 401 }));
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  if (hasAppleIdentity(user)) {
    let authorizationCode: unknown;
    try {
      authorizationCode = (await request.json())?.authorizationCode;
    } catch {
      authorizationCode = null;
    }
    if (typeof authorizationCode !== "string" || !authorizationCode) {
      console.warn(
        JSON.stringify({ event: "delete_profile_failed", error: "apple_authorization_required", status: 400 }),
      );
      return Response.json({ error: "apple_authorization_required" }, { status: 400 });
    }

    try {
      const clientSecret = await createAppleClientSecret();
      const tokens = await exchangeAuthorizationCode(authorizationCode, clientSecret);
      const linkedSubject = appleSubjectOf(user);
      const authorizedSubject = tokens?.id_token ? decodeJwtPayload(tokens.id_token)?.sub : null;
      if (!linkedSubject || !authorizedSubject || linkedSubject !== authorizedSubject) {
        console.warn(JSON.stringify({ event: "delete_profile_failed", error: "apple_identity_mismatch", status: 403 }));
        return Response.json({ error: "apple_identity_mismatch" }, { status: 403 });
      }

      const token = tokens?.refresh_token ?? tokens?.access_token;
      const tokenType = tokens?.refresh_token ? "refresh_token" : "access_token";
      if (!token || !(await revokeAppleToken(token, clientSecret, tokenType))) {
        console.error(
          JSON.stringify({ event: "delete_profile_failed", error: "apple_revocation_failed", status: 502 }),
        );
        return Response.json({ error: "apple_revocation_failed" }, { status: 502 });
      }
      console.log(JSON.stringify({ event: "apple_token_revoked" }));
    } catch {
      console.error(JSON.stringify({ event: "delete_profile_failed", error: "apple_revocation_failed", status: 502 }));
      return Response.json({ error: "apple_revocation_failed" }, { status: 502 });
    }
  }

  const { error } = await supabase.auth.admin.deleteUser(user.id, false);
  if (error) {
    console.error(JSON.stringify({ event: "delete_profile_failed", error: "delete_failed", status: 500 }));
    return Response.json({ error: "delete_failed" }, { status: 500 });
  }
  console.log(JSON.stringify({ event: "delete_profile_completed", status: 200 }));

  return Response.json({ deleted: true });
});
