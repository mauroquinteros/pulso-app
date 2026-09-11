# Shipping an iOS build to TestFlight

How a build of this app gets from a clean checkout to a tester's phone. Written after doing it for the first time on 2026-09-05, so it records the traps that cost time, not just the happy path. Extended on 2026-09-10, when the first public link went out and the Google consent screen turned out to be a release of its own.

**The route is a local Xcode archive, not EAS Build.** That choice matters more than it looks, and the reason is the environment variables - see
[Environment variables](#environment-variables). If someone later moves this to EAS or to CI, most of this document still applies, but that section and [Code signing](#3-code-signing-and-why-a-physical-device-is-needed) change completely.

## What this route assumes

- An active **Apple Developer Program** membership (99 USD/year). TestFlight will not work without it.
- **Xcode** installed, with the iOS SDK that ships inside it. The multi-GB
  "iOS platform" download offered on Xcode's first launch is the **simulator
  runtime**, not the SDK - decline it if a runtime is already installed.
- A **physical iPhone**, available once. Not for testing - for registration.
  [Code signing](#3-code-signing-and-why-a-physical-device-is-needed) explains why a distribution build ends up needing a development profile.
- `ios/` and `android/` are **generated and gitignored** (Expo CNG). Nothing in them is authored by hand, so `npx expo prebuild -p ios --clean` is always safe and always the way to reset them. Anything edited there is lost on the next regeneration.

## The configuration that lives in the repo

Everything Apple-facing is in `app.json`. The native project is derived from it, never the reverse.

```json
"ios": {
  "bundleIdentifier": "com.mauroquinteros.pulso",
  "appleTeamId": "297MPWT757",
  "buildNumber": "1",
  "supportsTablet": true,
  "config": { "usesNonExemptEncryption": false }
}
```

- **`bundleIdentifier`** must match the App ID registered with Apple and the bundle ID chosen in App Store Connect. It is the join key between al three.
- **`appleTeamId`** is what writes `DEVELOPMENT_TEAM` into the Xcode project. Because it lives here, regenerating `ios/` does not lose the team - which is what makes `prebuild --clean` cheap.
- **`buildNumber`** must be **unique per upload**. App Store Connect rejects a repeat. Bump it before every archive; `version` only changes for a real release.
- **`usesNonExemptEncryption: false`** writes `ITSAppUsesNonExemptEncryption` into `Info.plist`, which answers the export-compliance question ahead of time. Without it, every single upload stops to ask. The iOS deployment target is **15.1**, set by the Expo template.

## Environment variables

`lib/supabase.ts` and `lib/google-sign-in.ts` read `EXPO_PUBLIC_*` variables, and `.env` is **gitignored**.

On this route that is fine: the Xcode build phase _Bundle React Native code and images_ runs Metro locally, which loads `.env` and inlines the values into the JS bundle. Verified, not assumed - see [Verification commands](#verification-commands).

**On EAS Build it would not be fine.** `.env` is gitignored, so it is not
uploaded, and the binary would ship with `undefined` for the Supabase URL, the publishable key and the Google client. The app would install and then die at sign-in. Anyone moving this to EAS must declare those variables in `eas.json` or as EAS environment variables first.

## First-time setup

Once per machine and Apple account. Skip to [Every release](#every-release) afterwards.

### 1. Add the Apple account to Xcode

**Xcode -> Settings -> Accounts**, add the Apple ID that holds the Developer Program membership. Automatic signing cannot create anything without it.

### 2. Register the App ID

Open the workspace - **`open ios/Pulso.xcworkspace`**, never the `.xcodeproj`. CocoaPods generates the workspace, and it is the only entry point that has the Pods project attached; opening the bare project fails with missing headers.

Select the **Pulso** target (under TARGETS, not PROJECT) -> **Signing &
Capabilities**. Confirm _Automatically manage signing_ is checked and pick the Team. Xcode registers `com.mauroquinteros.pulso` as an App ID at this point, which is what later makes it appear in App Store Connect's bundle ID dropdown.

Expect it to then fail with:

```
Communication with Apple failed: Your team has no devices from which to
generate a provisioning profile.
No profiles for 'com.mauroquinteros.pulso' were found.
```

That is the next section. The App ID is registered regardless.

### 3. Code signing, and why a physical device is needed

The Expo template writes this into **both** Debug and Release at project level:

```
"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "iPhone Developer";
```

It pins a **development** identity even for Release, so archiving asks Apple for an _iOS App Development_ provisioning profile. A development profile is a list of the devices allowed to run the build - with zero devices registered there is nothing to put in it, and Apple refuses to issue one. The archive fails.

This is upstream template residue, not something this repo sets - `grep -rn
CODE_SIGN_IDENTITY` over the tracked files finds nothing. It survives because most React Native developers register a phone on day one and never see it. Expo's own signing guide assumes a connected device and does not cover archiving at all.

**The fix is to register one device.** Connect an iPhone over USB:

1. Unlock the phone and accept **Trust This Computer**.
2. On the phone, **Settings -> Privacy & Security -> Developer Mode** -> on ->
   restart -> unlock and confirm **Turn On**. The menu entry only appears after the phone has been connected to Xcode once. Without this, the connection dies with `com.apple.dt.coredevice.untrusted.tunnelservice` and CoreDeviceError 4000.
3. **Window -> Devices and Simulators** (`Shift+Cmd+2`), wait for _Preparing device for development_.
4. Back in **Signing & Capabilities**, click **Try Again**.

A profile named `iOS Team Provisioning Profile: com.mauroquinteros.pulso` appears, carrying that device's UDID and valid for a year. **The phone can be disconnected immediately afterwards** - registration lives in the Apple account, and archiving for `Any iOS Device` never touches it.

An "Unable to copy shared cache files / Broken pipe" failure during `dtfetchsymbols` at this stage is harmless. It only affects symbolicating crashes while debugging on device.

**The alternative, for a machine with no phone:** turn off automatic signing, create an Apple Distribution certificate and an App Store provisioning profile by hand in the developer portal, and select them manually. It works and needs no device, but `prebuild` resets signing to automatic, so keeping it requires a custom `withXcodeProject` config plugin. Only worth it for CI, where no device will ever exist.

### 4. Create the app record in App Store Connect

Two different Apple sites, easy to confuse:

| Site                        | Holds                                                                        |
| --------------------------- | ---------------------------------------------------------------------------- |
| `developer.apple.com`       | Certificates, Identifiers & Profiles - App IDs, certs, provisioning profiles |
| `appstoreconnect.apple.com` | The app record, TestFlight, builds, store metadata                           |

The app record goes in **App Store Connect** -> My Apps -> **+** -> New App:

- **Platforms:** iOS
- **Name:** must be unique across the entire App Store. `Pulso` was taken; this app is registered as **Pulso - Finances**. That is the storefront name only - the name under the icon comes from `"name": "Pulso"` in `app.json`.
- **Bundle ID:** pick `com.mauroquinteros.pulso` from the dropdown. If it is not listed, step 2 has not run yet.
- **SKU:** an internal identifier, never shown publicly, **not editable later**.
- **User Access:** Full Access.

## Every release

1. **Bump `ios.buildNumber`** in `app.json`. A repeated build number is rejected at the end of the upload, after the wait.
2. Set the destination to **Any iOS Device (arm64)**. With a simulator selected, **Product -> Archive** is greyed out; with a specific phone selected, the build is not generic enough to distribute.
3. **Product -> Archive.** Several minutes - it compiles Release including all Pods. The Organizer opens on success.
4. **Validate App** -> _App Store Connect_ -> defaults -> automatic signing. This runs the same checks as the upload without spending the upload. On the first run Xcode creates the **Apple Distribution** certificate here; allow the keychain prompt.
5. **Distribute App** -> **App Store Connect** -> defaults -> **Upload**. Choose _App Store Connect_, **not** _TestFlight Internal Only_. The latter produces a build that can never be promoted to the App Store.
6. The build appears under TestFlight as _Processing_, then _Ready to Submit_. Minutes to half an hour, with an email at the end. **Uploading publishes nothing.** The build lands in TestFlight only. Reaching the App Store requires filling the store metadata and pressing _Submit for Review_ explicitly.

## Warnings that are not problems

**`Upload Symbols Failed` - missing dSYM for `React.framework`,
`ReactNativeDependencies.framework`, `hermes.framework`.** The prebuilt React Native artifacts ship without debug symbols. Known upstream ([react-native#46853](https://github.com/facebook/react-native/issues/46853), [#49059](https://github.com/facebook/react-native/issues/49059)).
The only real fix is building Hermes from source. The cost of ignoring it: a crash _inside_ those frameworks symbolicates to addresses instead of function names. App code is unaffected. It does not block validation, upload, TestFlight or review.

**`expo-secure-store` (historical).** Its config plugin injected `NSFaceIDUsageDescription` into the shipped `Info.plist`, carrying Expo's English placeholder, for a permission this app never requests. The package was dead - the sign-in slice chose AsyncStorage - and was removed in `9481a4d`.
Mentioned here so nobody re-adds it. `expo-web-browser` is dead too but injects nothing, so it stays.

## App Privacy answers for this app

Filled in App Store Connect -> Distribution -> **App Privacy**. Required before App Store submission; Apple's docs do not list it as a gate for external TestFlight, but it is short and it is coming either way.

The "Optional Disclosure" exemption does **not** apply here: it requires the data to be outside the app's primary functionality and optional for the user, and sign-in plus movements are neither.

| Category       | Data type            | Where it comes from                         |
| -------------- | -------------------- | ------------------------------------------- |
| Contact Info   | Email Address        | Google Sign-In; shown in Ajustes            |
| Contact Info   | Name                 | Google Sign-In; drives the avatar initials  |
| Financial Info | Other Financial Info | Movements the user records                  |
| Identifiers    | User ID              | Supabase `auth.uid()`, the key on every row |

For **each** of the four, the answers are identical:

- **Purpose:** App Functionality only. Not Analytics, not Product Personalization, not advertising.
- **Linked to the user's identity:** Yes. Everything hangs off `user_id`.
- **Used for tracking:** No. Nothing is cross-referenced with third-party data or shared with data brokers - which is also why the app needs no ATT prompt.

Everything else is unchecked. There is no analytics, crash-reporting or advertising SDK in `package.json`, and **Phone Number is not collected** - `Profile` is `{ name, email }` and nothing anywhere stores a phone.

Also in this section: **Privacy Policy URL** is required, **User Privacy Choices URL** is optional.

## Distributing to testers

**Internal** - up to 100 App Store Connect users, no Apple review, available as soon as the build finishes processing. TestFlight -> INTERNAL TESTING -> **+**, create a group, add testers, attach the build. Email invitations only; there is no shareable link.

**External** - up to 10,000 testers, and the only path to a **public link**. A group's type is fixed when it is created and cannot be converted, so the external group is a _second_ group beside the internal one, not a setting on it. The same build can sit in both, which is the useful arrangement: the internal group works the moment processing ends, and a build only reaches the external group - and therefore Beta App Review - once it is worth someone else's time.

### Test Information

Filled once under TestFlight -> Test Information, and shared by every external build.

**Beta App Description** is the field App Store Connect marks required, but for external testing the **Sign-In Information** fields become required too. The description is shown to testers _and_ read by Beta App Review; write it for the reviewer, in English even though the UI is Spanish, and say so in it - a reviewer who is not expecting Spanish wastes time or files a confused rejection. Say plainly that the app connects to no bank or broker and moves no money, because a finance app that does not say so invites questions about its regulatory status.

**Sign-In Information** is not optional here. Google is the only login, and a reviewer who cannot get past `app/(auth)/sign-in.tsx` rejects with "unable to review". Apple's own tooltip covers the case: _"If users sign in using social media, provide information for an account we can use."_

That account wants care, because it is a real Google login performed from Apple's network:

- **Dedicated, never personal** - the password goes to Apple as plain text in a form.
- **Seeded with movements of every type.** A reviewer who lands on an empty home screen cannot find the features the description promises.

### The public link

EXTERNAL TESTING -> **+** to create the group, then its Builds tab -> **+** to attach the build, which is what submits it to Beta App Review. Once a build in the group is approved, the group's **Public Link** section yields `https://testflight.apple.com/join/<code>`. The tester limit shown there is the one set when the link was enabled, and raises to 10,000 under _Manage_.

A build expires **90 days after upload**. The link itself survives; installs stop working, because nothing valid sits behind it.

## The sign-in screen is a second release

The part with no warning signs, and the reason this document grew. A build can be approved, the public link live and the app installable, while every tester still stalls at the login - because the Google consent screen has its own publishing state, in a different console, that nothing in App Store Connect mentions.

`console.cloud.google.com/auth/audience` carries a **Publishing status** of _Testing_ or _In production_. In Testing, only addresses on that page's own **Test users** list get past the consent screen; everyone else is refused with `Access blocked`. Survivable while the testers are people you can list by hand. A public link is by definition people you cannot, so it requires _In production_.

That list is the _whole_ of what publishing buys here. Testing mode also expires Google refresh tokens after seven days, and most accounts of it warn that testers will be silently logged out every week - which is not true of this app and is not a reason to publish.

### What publishing requires

Google will not publish a consent screen whose **Branding** page is incomplete, and complete includes a **privacy policy link** - the screen faces the public, so the public is told where the policy is. That link's domain has to be listed in **Authorized domains**, and a domain gets there only once Google Search Console says you control it. Otherwise an app could display a bank's domain on a screen carrying Google's name.

This looks solved when it is not: the Supabase domain is _already_ in Authorized domains, because Google adds the domain of an OAuth client's redirect URI automatically. The first domain added by hand is the one that teaches you about Search Console.

Verifying it: add the site as a **URL prefix** property and choose the **HTML tag** method, then put the tag in the page's `<head>`. Prefer the tag to the file - the file Google hands you is a single line of plain text under an `.html` name, which any formatter in the repo will cheerfully rewrite. The tag stays in the page permanently; Google re-checks, and an unverified domain takes the consent screen down with it.

The policy for this app lives in its own repo, deployed at `https://pulso-finances.vercel.app`, with the policy at `/privacy`. Separate from this repo because it is an Astro site.

### Verification, and why the logo is not worth it

Non-sensitive scopes need no verification, and this app only has those: `lib/google-sign-in.ts` configures `iosClientId` and nothing else, so it gets the library defaults, `email` and `profile`. An unverified app on those scopes runs in production normally, with no interstitial.

Uploading a **logo** to the Branding page is what puts the project into brand verification, independently of scopes. And brand verification asks a different question from Search Console - not who controls the site, but who the domain is **registered** to. `vercel.app` is registered to Vercel, so it answers _"The website of your home page URL is not registered to you"_, and no amount of Search Console verification changes that. The only fixes are to drop the logo or to buy a domain.

Nothing breaks in the meantime. The Audience page keeps a yellow _"Your app requires verification"_ banner, sign-in works, testers are unaffected. The banner governs whether the logo is displayed, not whether the app runs.

## Still open

- **Guideline 4.8.** `app/(auth)/sign-in.tsx` offers Google as the only sign-in. Apple requires an equivalent privacy-preserving option - in practice Sign in with Apple - for apps using third-party login. Does not block internal testing; can surface in Beta App Review; **does** block App Store release.
- **In-app account deletion.** Guideline 5.1.1(v): an app that lets accounts be created must let them be deleted from inside it. `app/(tabs)/settings.tsx` offers only "Cerrar sesión", whose own comment is explicit that nothing is destroyed. Not a TestFlight blocker; an automatic App Store rejection, and reviewers check it directly. The schema keeps it small - every user-owned table is `ON DELETE CASCADE` from `auth.users`, so deleting the auth user empties the Perfil - which makes the work one Edge Function holding `service_role` to call `auth.admin.deleteUser`, shaped like `resolve-stock`, plus a destructive entry in Ajustes.
- **Beta App Review sign-in credentials.** A dedicated review account now exists, but the fragility does not go away: Google can challenge a login from an unfamiliar location, and there is nothing to do about it from this side when it happens.

## Verification commands

Cheap checks that answer a question outright instead of waiting for a build to fail.

**Are the env vars really in the production bundle?** Exports through the same path the archive uses, then greps the Hermes bytecode:

```bash
npx expo export --platform ios --output-dir /tmp/export-check
strings /tmp/export-check/_expo/static/js/ios/*.hbc | grep -c "<supabase-host>"
```

**Device, pairing and Developer Mode state:**

```bash
xcrun devicectl list devices -v | grep -A1 -E "developerModeStatus|pairingState|tunnelState"
```

`developerModeStatus: enabled` and `tunnelState: connected` are what a usable
device looks like.

**Signing identities in the keychain:**

```bash
security find-identity -v -p codesigning
```

_Apple Development_ appears after step 2; _Apple Distribution_ only after the first Validate or Distribute.

**Provisioning profiles.** Xcode 15+ writes them to

```bash
ls ~/Library/Developer/Xcode/UserData/Provisioning\ Profiles/
```

**not** the legacy `~/Library/MobileDevice/Provisioning Profiles/`, which stays empty and will make you think signing failed. Decode one with:

```bash
security cms -D -i <profile>.mobileprovision | plutil -extract Name raw -
```

**What ships in `Info.plist`:**

```bash
grep -A1 -E "CFBundleVersion|ITSAppUsesNonExemptEncryption|UsageDescription" ios/Pulso/Info.plist
```
