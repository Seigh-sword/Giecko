# Giecko mobile

The Giecko app for iOS and Android, written in React Native (Expo).

Launch sessions, watch them come up and use them from the same screen:

- Guide: what Giecko is and how the pieces fit
- Launch: dispatch a session to your repo (runner OS, stack, password,
  duration) with a GitHub token that has the workflow scope
- Sessions: your recent workflow runs and their status
- Connect: paste the session URL (the GIECKO IS LIVE banner in the run
  log) and it opens inside the app

## Build the Android APK

From a checkout:

```
cd mobile
npm ci
npx expo prebuild -p android --no-install
cd android && ./gradlew assembleRelease
```

The APK lands in `android/app/build/outputs/apk/release/`.

GitHub Releases: the `mobile.yml` workflow builds the APK on every
`[mobile]` push and, when you push a `v*` tag, attaches the APK to that
release automatically.

## iOS

The same React Native code builds for iOS with `npx expo prebuild -p ios`
and Xcode. Signing needs your Apple developer account, so iOS builds
happen on your machine — the repo has no iOS signing secrets.

## Notes

- The token lives in memory only: the app never stores it
- Session URLs are long-lived Cloudflare tunnels; the app just opens
  them
- Everything the runners do is the same Giecko workflow the CLI and the
  browser use
