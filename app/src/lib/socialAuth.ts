/**
 * Social Authentication Service
 * Handles Google, Apple, and other OAuth providers
 */

import { supabase } from "./supabase";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { makeRedirectUri } from "expo-auth-session";
import { Platform, Alert } from "react-native";

// Complete auth session for OAuth
WebBrowser.maybeCompleteAuthSession();

// Redirect URI for OAuth
const redirectUri = makeRedirectUri({
  scheme: "quest",
  path: "auth/callback",
});

export interface SocialAuthResult {
  success: boolean;
  error?: string;
  user?: any;
}

class SocialAuthService {
  /**
   * Sign in with Google
   */
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

      // For native, we need to open the URL
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );

        if (result.type === "success") {
          // Extract tokens from the URL hash fragment
          const url = new URL(result.url);
          const hash = url.hash.substring(1); // Remove leading #
          const params = new URLSearchParams(hash);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken) {
            const { data: sessionData, error: sessionError } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || "",
              });

            if (sessionError) {
              return { success: false, error: sessionError.message };
            }

            // Create profile if doesn't exist
            if (sessionData.user) {
              const { data: existingProfile } = await supabase
                .from("profiles")
                .select("id")
                .eq("id", sessionData.user.id)
                .single();

              if (!existingProfile) {
                await supabase.from("profiles").insert({
                  id: sessionData.user.id,
                  email: sessionData.user.email,
                  display_name:
                    sessionData.user.user_metadata?.full_name ||
                    sessionData.user.email?.split("@")[0],
                  avatar_url: sessionData.user.user_metadata?.avatar_url,
                });
              }
            }

            return { success: true, user: sessionData.user };
          }
        }

        return { success: false, error: "Inicio de sesión cancelado" };
      }

      return { success: false, error: "No se pudo iniciar la autenticación" };
    } catch (error: any) {
      console.error("Google sign in error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sign in with Apple (iOS only)
   */
  async signInWithApple(): Promise<SocialAuthResult> {
    if (Platform.OS !== "ios") {
      return {
        success: false,
        error: "Apple Sign In solo está disponible en iOS",
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: redirectUri,
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

        if (result.type === "success") {
          // Extract tokens from the URL hash fragment
          const url = new URL(result.url);
          const hash = url.hash.substring(1); // Remove leading #
          const params = new URLSearchParams(hash);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken) {
            const { data: sessionData, error: sessionError } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || "",
              });

            if (sessionError) {
              return { success: false, error: sessionError.message };
            }

            // Create profile if doesn't exist
            if (sessionData.user) {
              const { data: existingProfile } = await supabase
                .from("profiles")
                .select("id")
                .eq("id", sessionData.user.id)
                .single();

              if (!existingProfile) {
                await supabase.from("profiles").insert({
                  id: sessionData.user.id,
                  email: sessionData.user.email,
                  display_name:
                    sessionData.user.user_metadata?.full_name ||
                    sessionData.user.email?.split("@")[0],
                  avatar_url: sessionData.user.user_metadata?.avatar_url,
                });
              }
            }

            return { success: true, user: sessionData.user };
          }
        }

        return { success: false, error: "Inicio de sesión cancelado" };
      }

      return { success: false, error: "No se pudo iniciar la autenticación" };
    } catch (error: any) {
      console.error("Apple sign in error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sign in with GitHub (for developers)
   */
  async signInWithGitHub(): Promise<SocialAuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: redirectUri,
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

        if (result.type === "success") {
          const url = new URL(result.url);
          const accessToken = url.searchParams.get("access_token");
          const refreshToken = url.searchParams.get("refresh_token");

          if (accessToken) {
            const { data: sessionData, error: sessionError } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || "",
              });

            if (sessionError) {
              return { success: false, error: sessionError.message };
            }

            return { success: true, user: sessionData.user };
          }
        }
      }

      return { success: false, error: "Inicio de sesión cancelado" };
    } catch (error: any) {
      console.error("GitHub sign in error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Link a social account to existing user
   */
  async linkAccount(
    provider: "google" | "apple" | "github"
  ): Promise<SocialAuthResult> {
    try {
      const { data, error } = await supabase.auth.linkIdentity({
        provider,
        options: {
          redirectTo: redirectUri,
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

        if (result.type === "success") {
          return { success: true };
        }
      }

      return { success: false, error: "Vinculación cancelada" };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get list of linked identities
   */
  async getLinkedIdentities(): Promise<string[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      return (user.identities || []).map((i) => i.provider);
    } catch (error) {
      return [];
    }
  }
}

export const SocialAuth = new SocialAuthService();
export default SocialAuth;
