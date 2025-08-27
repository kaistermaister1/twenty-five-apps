import { createClient } from "@supabase/supabase-js";

// Client-side singleton. Make sure you set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  {
    realtime: { params: { eventsPerSecond: 15 } },
  }
);


