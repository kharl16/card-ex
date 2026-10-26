import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { requireSuperAdmin } from "../_shared/adminAuth.ts";

Deno.test("admin authorization rejects a fabricated administrator token", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = Deno.env.get("SUPABASE_URL");
  const originalKey = Deno.env.get("SUPABASE_ANON_KEY");
  Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
  Deno.env.set("SUPABASE_ANON_KEY", "test-publishable-key");
  globalThis.fetch = async () => new Response(JSON.stringify({ message: "Invalid JWT", code: "bad_jwt" }), { status: 401, headers: { "Content-Type": "application/json" } });
  try {
  const fake = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })) + "." + btoa(JSON.stringify({ sub: "a0efd175-4704-495e-a755-a18d1bd8dab8", role: "authenticated", exp: 4102444800 })) + ".fake";
  const response = await requireSuperAdmin(new Request("http://localhost", { headers: { Authorization: `Bearer ${fake}` } }));
  assertEquals(response instanceof Response ? response.status : 200, 401);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl) Deno.env.set("SUPABASE_URL", originalUrl); else Deno.env.delete("SUPABASE_URL");
    if (originalKey) Deno.env.set("SUPABASE_ANON_KEY", originalKey); else Deno.env.delete("SUPABASE_ANON_KEY");
  }
});

Deno.test("admin authorization rejects missing credentials", async () => {
  const response = await requireSuperAdmin(new Request("http://localhost"));
  assertEquals(response instanceof Response ? response.status : 200, 401);
});