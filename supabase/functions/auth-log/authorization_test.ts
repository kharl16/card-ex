import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { requireSuperAdmin } from "../_shared/adminAuth.ts";

Deno.test("admin authorization rejects a fabricated administrator token", async () => {
  const fake = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })) + "." + btoa(JSON.stringify({ sub: "a0efd175-4704-495e-a755-a18d1bd8dab8", role: "authenticated", exp: 4102444800 })) + ".fake";
  const response = await requireSuperAdmin(new Request("http://localhost", { headers: { Authorization: `Bearer ${fake}` } }));
  assertEquals(response instanceof Response ? response.status : 200, 401);
});

Deno.test("admin authorization rejects missing credentials", async () => {
  const response = await requireSuperAdmin(new Request("http://localhost"));
  assertEquals(response instanceof Response ? response.status : 200, 401);
});