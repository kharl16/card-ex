import * as emailJs from "@lovable.dev/email-js";

Deno.test("discover email-js exports", () => {
  console.log("All exports from @lovable.dev/email-js:", Object.keys(emailJs));
  console.log("Full module:", emailJs);
});
