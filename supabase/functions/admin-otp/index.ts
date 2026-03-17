import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function hashOtp(otp: string): Promise<string> {
  const data = new TextEncoder().encode(otp);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateOtp(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1000000).padStart(6, "0");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();
    const { action, email, otp } = body;

    if (action === "send") {
      const adminEmail = Deno.env.get("ADMIN_EMAIL");
      if (!email || email !== adminEmail) {
        return new Response(JSON.stringify({ error: "Unauthorized email" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete existing OTPs
      await supabase.from("admin_otps").delete().eq("email", email);

      // Generate and store hashed OTP
      const newOtp = generateOtp();
      const otpHash = await hashOtp(newOtp);
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

      const { error: insertError } = await supabase.from("admin_otps").insert({
        email, otp_hash: otpHash, expires_at: expiresAt, used: false,
      });

      if (insertError) {
        return new Response(JSON.stringify({ error: "Failed to generate OTP" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // OTP is stored hashed in DB only. Not logged for security.

      return new Response(JSON.stringify({ success: true, message: "OTP generated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      const adminEmail = Deno.env.get("ADMIN_EMAIL");
      const fallbackOtp = Deno.env.get("FALLBACK_OTP");

      if (!email || email !== adminEmail) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check fallback OTP (stored only in env, never in code)
      if (fallbackOtp && otp === fallbackOtp) {
        await supabase.from("admin_otps").delete().eq("email", email);
        return new Response(JSON.stringify({ success: true, verified: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get stored OTP record
      const { data: otpRecord, error } = await supabase
        .from("admin_otps").select("*")
        .eq("email", email).eq("used", false)
        .order("created_at", { ascending: false })
        .limit(1).single();

      if (error || !otpRecord) {
        return new Response(JSON.stringify({ error: "No valid OTP found. Request a new one." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check expiry
      if (new Date(otpRecord.expires_at) < new Date()) {
        await supabase.from("admin_otps").delete().eq("id", otpRecord.id);
        return new Response(JSON.stringify({ error: "OTP expired. Request a new one." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify hash
      const inputHash = await hashOtp(otp);
      if (inputHash !== otpRecord.otp_hash) {
        return new Response(JSON.stringify({ error: "Invalid OTP" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete used OTP (single-use)
      await supabase.from("admin_otps").delete().eq("id", otpRecord.id);

      return new Response(JSON.stringify({ success: true, verified: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
