# <img src="https://cdn.simpleicons.org/android/3FB950" width="28" valign="middle"> Mobile App

![stack](https://img.shields.io/badge/React_Native-%2B_Expo-3FB950?labelColor=0B111C&style=flat-square)
![android](https://img.shields.io/badge/Android-APK_in_releases-3FB950?labelColor=0B111C&style=flat-square&logo=android&logoColor=white)
![ios](https://img.shields.io/badge/iOS-build_it_yourself-3FB950?labelColor=0B111C&style=flat-square&logo=apple&logoColor=white)

> Giecko in your pocket: launch sessions, watch them go live, and use
> them — all inside the app.

## Install

1. Open the repository **Releases** page
2. Grab `giecko-v0.7.0-android.apk` (or the latest)
3. Install it (allow "install unknown apps" for your browser/download
   manager once)

No store, no account, no tracking. The APK is built by the `mobile`
workflow on every `[mobile]` push and attached to releases.

## What is inside

| Screen | What it does |
|---|---|
| Guide | the whole workflow explained, in the app, with the icons |
| Launch | one-tap session: runner OS, stack, password, duration |
| Runs | your recent runs, live status, links |
| Session | the terminal / IDE / desktop opening **inside the app** (WebView) |

- **QR codes** render natively (bundled library, no network calls)
- **No password typing in the app** — passwords are set at launch time
  on GitHub's side; the app only opens what you launched
- **Heavily styled** — the GIECKO palette, the gecko icon, dark UI

## The in-app session

The session opens in an in-app WebView against the same HTTPS tunnels
a browser would use:

- terminal fits the phone (xterm + Fit Addon)
- IDE works in mobile layout
- desktop streams with pinch-zoom (noVNC)

Losing connectivity is fine — the session lives on the runner in tmux;
reopen the run and you are back.

## iOS

Expo builds for iOS too — with an Apple developer setup you can run
`npx expo run:ios` from the `mobile/` directory yourself. The release
pipeline only ships the Android APK (no Apple account attached).

## Phone, no app?

Scan the QR code from the run summary on GitHub — it opens the session
in the phone's browser. Same URLs, same password.

---

← [Distros & OS](Distros.md) · [tiny-giecko](tiny-giecko.md) →
