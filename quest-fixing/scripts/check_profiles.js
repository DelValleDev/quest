const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.log(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in env"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

(async function () {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .limit(5);
    if (error) {
      console.error("Error querying profiles:", error.message || error);
      process.exit(1);
    }
    console.log("Profiles rows:", data);
  } catch (e) {
    console.error("Exception:", e);
    process.exit(1);
  }
})();
