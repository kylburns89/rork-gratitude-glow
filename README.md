# rork-gratitude-glow
Created by Rork

## In‑App Purchases (RevenueCat) Setup

1) Create a RevenueCat project and apps for iOS/Android. Add entitlements (e.g. `premium`) and an Offering (e.g. `default`).
2) In `app.json` set `expo.extra.revenuecat.iosApiKey`, `androidApiKey`, optional `entitlement` and `offering`.
3) Create a dev build to test IAPs (Expo Go cannot load native RevenueCat):

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

4) Test with sandbox accounts and products configured in App Store Connect / Google Play.

### Using the paywall

- The Premium modal at `app/premium.tsx` triggers a purchase flow via RevenueCat.
- A Restore Purchases action is available in the Profile screen when not premium.

## EAS Build Profiles

Add `eas.json` similar to:

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

## iOS App Store Checklist

- Ensure bundle identifier in `app.json` matches App Store Connect app.
- Add in‑app purchase products in App Store Connect and link them in RevenueCat.
- Create screenshots, privacy policy URL, and fill metadata.
- Build and submit:

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

## Android Play Store Checklist

- Ensure `android.package` matches Play Console app.
- Create products and link in RevenueCat.
- Build and submit:

```bash
eas build --platform android --profile production
eas submit --platform android
```
