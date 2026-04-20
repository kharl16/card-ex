const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { title, author, mode } = await req.json();
    if (!title || !author) {
      return new Response(JSON.stringify({ error: "title and author required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isDeepDive = mode === "deep";

    const summaryPrompt = `Provide a comprehensive book summary of "${title}" by ${author}.

Format your response in markdown with these sections:
## Overview
A 2-3 sentence high-level summary.

## Key Ideas
5-7 bullet points covering the most important concepts and lessons.

## Chapter / Section Highlights
Brief breakdown of major themes or chapters (4-6 bullets).

## Actionable Takeaways
3-5 specific actions the reader can apply to their life today.

## Best Quote
One memorable quote from the book.

Keep it engaging, practical, and around 400-500 words total.`;

    const deepPrompt = `Write an audiobook-style deep-dive narration of "${title}" by ${author}.

This should feel like a long, conversational audiobook walkthrough — engaging, warm, and detailed. Aim for 2500-3500 words.

Format in markdown with these sections:

## Introduction
Hook the listener. Why this book matters and what they'll gain.

## The Author's Story
Brief context on ${author} and what inspired this book.

## Core Premise
The big idea in depth — explain it like you're talking to a friend.

## Chapter-by-Chapter Walkthrough
Go through each major chapter or section. For each one:
- Name the chapter/section as a ### heading
- Explain the main lesson in 2-3 paragraphs
- Include specific examples, stories, or frameworks from the book
- End with a one-line "takeaway"

## Key Frameworks & Models
Detail any signature frameworks, acronyms, or step-by-step systems the book teaches.

## Memorable Stories & Examples
Recount 3-5 of the most powerful anecdotes from the book.

## Powerful Quotes
List 5-7 of the most impactful quotes with brief context.

## How to Apply This Book
A practical 7-day or 30-day plan the reader can start tomorrow.

## Final Thoughts
Wrap up with the lasting impact of the book and who should read it.

Write in a warm, narrative voice — as if you're personally guiding the listener through the entire book.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: isDeepDive
              ? "You are a master audiobook narrator and book educator. You create deeply engaging, long-form walkthroughs of books that feel like personal coaching sessions."
              : "You are an expert book summarizer who creates clear, actionable summaries of personal development and business books.",
          },
          { role: "user", content: isDeepDive ? deepPrompt : summaryPrompt },
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const txt = await response.text();
      return new Response(JSON.stringify({ error: `AI error: ${txt}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
