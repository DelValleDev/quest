import { createClient } from "@supabase/supabase-js";

// Integration test using real Supabase project. Requires env vars in .env.test
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "Skipping Supabase integration tests due to missing env variables"
  );
  test("skip supabase integration", () => {});
} else {
  const client = createClient(url, anonKey);

  test("sign up and sign in a new user", async () => {
    const email = `test+${Date.now()}@example.com`;
    const password = "Test123!";

    // Sign up
    const { data: signUpData, error: signUpError } = await client.auth.signUp({
      email,
      password,
    });
    expect(signUpError).toBeNull();

    // Try sign in
    const { data: signInData, error: signInError } =
      await client.auth.signInWithPassword({ email, password });
    // signIn might require email to be confirmed depending on supabase settings; we'll just assert no fatal error returned
    expect(signInError).toBeNull();
    expect(signInData).toBeDefined();
  }, 20000);
}
