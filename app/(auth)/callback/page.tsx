"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = getSupabase();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Exchange code for session
        const { error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error) {
          console.error("Auth callback error:", error);
          router.push("/login?error=auth_callback_failed");
          return;
        }

        // Success - redirect to character select
        router.push("/characters");
      } catch (err) {
        console.error("Auth callback exception:", err);
        router.push("/login?error=auth_callback_failed");
      }
    };

    handleCallback();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
