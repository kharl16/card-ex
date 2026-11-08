// Super-admin tool: reads text from global library photos (packages, products,
// brochures, testimonies) and proposes Q&A pairs for the AI chatbot repository.
// Nothing is saved here — the admin reviews and saves from the AI Training page.
import { generateResponse, GatewayError } from "npm:@lovable.dev/ai-gateway@0.1.11";
import { z } from "npm:zod@3.23.8";
import { corsHeaders, json, requireSuperAdmin } from "../_shared/adminAuth.ts";

const TABLES = {
  packages: "global_package_images",
  products: "global_product_images",
  brochures: "global_brochure_images",
  testimonies: "global_testimony_images",
} as const;

type Category = keyof typeof TABLES;

const BodySchema = z.object({
  category: z.enum(["packages", "products", "brochures", "testimonies"]),
  imageIds: z.array(z.string().uuid()).min(1).max(4),
});

const GUIDANCE: Record<Category, string> = {
  packages:
    "These are IAM Worldwide membership PACKAGE photos (front and sometimes back). Capture the package name, price, points/PV, every inclusion with quantities, freebies and any rank or bonus information. Write Q&As like 'What is included in the Gold package?' and 'How much is the Platinum package?'.",
  products:
    "These are PRODUCT photos. Capture product name, SRP/price, size/count, key ingredients, benefits stated on the label, usage/dosage directions and certifications (FDA, Halal, etc.). Write Q&As like 'What are the ingredients of …?', 'How do I take …?', 'How much is …?'.",
  brochures:
    "These are BROCHURE pages. Capture every heading, bullet, ingredient, certification, usage instruction, health guide and endorser statement. Write Q&As a curious prospect would ask, one fact cluster per pair.",
  testimonies:
    "These are customer TESTIMONY posters (often in Filipino/Taglish). Capture the person's name, location if shown, the condition(s) they mention and the product(s) they used. Answers MUST be framed as a personal testimonial, e.g. 'According to a testimony shared by Maria of Cebu, …'. Never claim a product cures, treats or prevents a disease; end each testimony answer with 'Results vary; this is a personal experience, not medical advice.' Write Q&As like 'Are there testimonies about diabetes?'.",
};

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["photos"],
  properties: {
    photos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["image_id", "extracted_text", "qa"],
        properties: {
          image_id: { type: "string" },
          extracted_text: { type: "string" },
          qa: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["question", "answer"],
              properties: {
                question: { type: "string" },
                answer: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;

const ResultSchema = z.object({
  photos: z.array(
    z.object({
      image_id: z.string(),
      extracted_text: z.string(),
      qa: z.array(z.object({ question: z.string(), answer: z.string() })),
    }),
  ),
});

function outputText(resp: unknown): string {
  const output = (resp as { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> })
    ?.output ?? [];
  return output
    .filter((item) => item?.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((c) => c?.type === "output_text" && typeof c.text === "string")
    .map((c) => c.text)
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const guard = await requireSuperAdmin(req);
  if (guard instanceof Response) return guard;
  const { admin } = guard;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const { category, imageIds } = parsed.data;

  // Look up photos server-side so only real library images are read.
  const table = TABLES[category];
  const columns = category === "testimonies" ? "id, url, caption" : "id, url, url_2, caption, srp";
  const { data: rows, error } = await admin.from(table).select(columns).in("id", imageIds);
  if (error) {
    console.error("photo lookup failed", error);
    return json({ error: "Could not load photos" }, 500);
  }
  const photos = (rows ?? []) as unknown as Array<{
    id: string;
    url: string;
    url_2?: string | null;
    caption?: string | null;
    srp?: string | null;
  }>;
  if (photos.length === 0) return json({ photos: [] });

  const content: Array<
    { type: "input_text"; text: string } | { type: "input_image"; image_url: string; detail: "high" }
  > = [
    {
      type: "input_text",
      text:
        `${GUIDANCE[category]}\n\nFor EACH photo below: (1) transcribe all readable text into extracted_text (translate Filipino to English in brackets where helpful), and (2) write 2–8 clear, self-contained Q&A pairs in English using ONLY facts visible in the photo or its label. Include the product/package/person name inside each answer so it makes sense on its own. Skip pairs you cannot support from the photo. Return JSON matching the schema, one entry per photo, using the exact image_id given.`,
    },
  ];
  for (const p of photos) {
    const label = [p.caption && `label: ${p.caption}`, p.srp && `listed price: ${p.srp}`].filter(Boolean).join(", ");
    content.push({ type: "input_text", text: `image_id: ${p.id}${label ? ` (${label})` : ""}` });
    content.push({ type: "input_image", image_url: p.url, detail: "high" });
    if (p.url_2) {
      content.push({ type: "input_text", text: `Back side of image_id ${p.id}:` });
      content.push({ type: "input_image", image_url: p.url_2, detail: "high" });
    }
  }

  try {
    const resp = await generateResponse({
      model: "openai/gpt-6-astra",
      reasoning: { effort: "low" },
      input: [{ role: "user", content }],
      text: {
        format: { type: "json_schema", name: "photo_knowledge", strict: true, schema: OUTPUT_SCHEMA },
      },
    });

    const raw = outputText(resp);
    const result = ResultSchema.safeParse(JSON.parse(raw || "{}"));
    if (!result.success) {
      console.error("unexpected AI output", raw.slice(0, 500));
      return json({ error: "The AI returned an unreadable result. Please try this batch again." }, 502);
    }

    const known = new Set(photos.map((p) => p.id));
    return json({
      photos: result.data.photos
        .filter((p) => known.has(p.image_id))
        .map((p) => ({
          image_id: p.image_id,
          extracted_text: p.extracted_text.trim(),
          qa: p.qa
            .map((q) => ({ question: q.question.trim(), answer: q.answer.trim() }))
            .filter((q) => q.question && q.answer),
        })),
    });
  } catch (err) {
    if (err instanceof GatewayError) {
      console.error("gateway error", err.code, err.httpStatus, err.ids);
      if (err.httpStatus === 429) return json({ error: "The AI is busy. Please wait a minute and continue." }, 429);
      if (err.httpStatus === 402) return json({ error: "AI credits are used up. Please top up to continue." }, 402);
      return json({ error: "The AI service could not read these photos." }, 502);
    }
    console.error("extract-photo-knowledge error", err);
    return json({ error: "Unexpected error while reading photos" }, 500);
  }
});
