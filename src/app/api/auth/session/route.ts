import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const cookieStore = cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set({ name, value, ...options });
        });
      },
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name, options) {
        if (typeof cookieStore.delete === "function") {
          cookieStore.delete(name);
        } else {
          cookieStore.set({
            name,
            value: "",
            ...options,
            maxAge: 0,
          });
        }
      },
    },
  });
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      const message = userError.message ?? "";
      if (message.includes("Auth session missing")) {
        return NextResponse.json({ user: null, credits: 0 });
      }
      console.error("[auth.session] Failed to fetch user", userError);
      return NextResponse.json(
        { user: null, credits: 0, error: "USER_LOOKUP_FAILED", message },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json({ user: null, credits: 0 });
    }

    const { data, error: creditError } = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (creditError) {
      console.error("[auth.session] Failed to fetch credits", creditError);
    }

    return NextResponse.json({
      user,
      credits: data?.balance ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[auth.session] Unexpected error", message);
    return NextResponse.json(
      { user: null, credits: 0, error: "SESSION_FAILED", message },
      { status: 500 }
    );
  }
}
