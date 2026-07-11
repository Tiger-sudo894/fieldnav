# FieldNav

A simple outdoor navigation utility built with React, Vite, and Capacitor.

## Features

- Large live GPS latitude and longitude readout
- Accuracy, altitude, speed, and last-updated status
- Simple compass dial using device orientation when available
- Save the current location with a short name and optional notes
- Persistent saved-location list using local storage
- Capacitor native projects for Android and iOS

## Development

```sh
npm install
npm run dev
```

The development server usually starts at `http://localhost:5173/`.

## Web Build

```sh
npm run lint
npm run build
```

## Native Sync

After changing the React app, rebuild and sync the native projects:

```sh
npm run build
npx cap sync
```

## Open Native Projects

```sh
npx cap open android
npx cap open ios
```

Android builds require a configured JDK and Android SDK. iOS builds require Xcode on macOS.

## Android Release Build

The Android release signing config reads secrets from `android/keystore.properties`, which is intentionally ignored by git.

```sh
npm run build
npx cap sync android
cd android
./gradlew clean
./gradlew :app:bundleRelease
```

Play Console upload artifact:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

Optional release APK for local device testing:

```sh
cd android
./gradlew :app:assembleRelease
~/Android/Sdk/platform-tools/adb install -r app/build/outputs/apk/release/app-release.apk
```

If `adb` is not on your shell path, use the full path shown above.

## Play Store URLs

If GitHub Pages is enabled for this repository from the `docs/` folder on the `main` branch, use these public URLs in Play Console:

- Privacy Policy: `https://tiger-sudo894.github.io/fieldnav/privacy-policy.html`
- Support: `https://tiger-sudo894.github.io/fieldnav/support.html`
