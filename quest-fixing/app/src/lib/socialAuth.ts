import { supabase } from "./supabase";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { makeRedirectUri } from "expo-auth-session";
import { Platform, Alert } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const redirectUri = makeRedirectUri({ scheme: "quest", path: "auth/callback" });

export interface SocialAuthResult {
  success: boolean;
  error?: string;
  user?: any;
}

class SocialAuthService {
  async signInWithGoogle(): Promise<SocialAuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );
        if (result.type === "success" && result.url) {
          const url = new URL(result.url);
          const hash = url.hash.substring(1);
          const params = new URLSearchParams(hash);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken) {
            const { data: sessionData, error: sessionError } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || "",
              });

            if (sessionError)
              return { success: false, error: sessionError.message };
            return { success: true, user: sessionData.user };
          }
        }
        return { success: false, error: "Login cancelled or failed" };
      }

      return { success: false, error: "No OAuth url returned" };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }
}

export const SocialAuth = new SocialAuthService();
export default SocialAuth;
