# Google Fit / Health Connect Configuration for Quest App

## Android Setup (Google Fit / Health Connect)

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select your project
3. Enable the **Fitness API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Fitness API"
   - Click Enable

4. Configure OAuth consent screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Fill in app information
   - Add scopes:
     - `https://www.googleapis.com/auth/fitness.activity.read`
     - `https://www.googleapis.com/auth/fitness.body.read`
     - `https://www.googleapis.com/auth/fitness.location.read`

5. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Create OAuth 2.0 Client ID (Android type)
   - Use your app's package name: `com.noneuronas.quest`
   - Get SHA-1 fingerprint from your keystore

### 2. Get SHA-1 Fingerprint

For development:
```bash
cd android && ./gradlew signingReport
```

For EAS Build, get it from:
```bash
eas credentials
```

### 3. Health Connect (Android 14+)

For newer Android devices, Health Connect is the modern replacement for Google Fit.

Add to AndroidManifest.xml (handled by EAS):
```xml
<queries>
    <package android:name="com.google.android.apps.healthdata" />
</queries>

<uses-permission android:name="android.permission.health.READ_STEPS"/>
<uses-permission android:name="android.permission.health.READ_DISTANCE"/>
<uses-permission android:name="android.permission.health.READ_TOTAL_CALORIES_BURNED"/>
<uses-permission android:name="android.permission.health.READ_SLEEP"/>
<uses-permission android:name="android.permission.health.READ_EXERCISE"/>
```

## iOS Setup (Apple HealthKit)

### Already configured in app.json:
- `NSHealthShareUsageDescription` - Read permission description
- `NSHealthUpdateUsageDescription` - Write permission description

### Xcode Configuration (automatic with EAS):
1. Enable HealthKit capability in Xcode
2. Add HealthKit to entitlements

### Required Entitlements:
```xml
<key>com.apple.developer.healthkit</key>
<true/>
<key>com.apple.developer.healthkit.access</key>
<array/>
```

## Testing

### iOS Simulator:
HealthKit is NOT available in the iOS Simulator. You must test on a real device.

### Android Emulator:
Google Fit requires Google Play Services, which is only available on emulators with "Google Play" in the name.

## Usage in App

```typescript
import { 
  isHealthDataAvailable,
  requestHealthPermissions,
  getTodayHealthData,
  syncHealthDataToSupabase
} from './src/lib/healthKit';

// Check availability
const available = await isHealthDataAvailable();

// Request permissions (shows system dialog)
const permissions = await requestHealthPermissions();

// Get today's data
const data = await getTodayHealthData();
console.log(`Steps: ${data.steps}, Calories: ${data.activeCalories}`);

// Sync to database
await syncHealthDataToSupabase(userId, supabase);
```
