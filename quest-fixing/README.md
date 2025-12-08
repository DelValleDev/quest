# Quest Fixing - Login Implementation (based on 9ef13c8)

This folder contains a minimal copy of the `app` from commit `9ef13c8` with a simplified login flow and Google OAuth scaffolding.

How to run:

1. Install dependencies (from the `app` folder):

```powershell
cd quest\quest-fixing\app
npm install
```

2. Copy `.env.example` to `.env` and fill in these variables (get from your Supabase project):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Optional: `EXPO_PUBLIC_GOOGLE_CLIENT_ID` (for OAuth)

3. Start the Expo server:

```powershell
npm start
```

Notes:
- This is intentionally isolated from the main project to avoid any changes in the primary workspace.
- I did not copy any `supabase/migrations` from the `quest` project; instead, a `migracion-fixed` folder is present to add necessary SQL changes incrementally.
