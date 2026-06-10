// Friendly error mapper for Supabase template save failures.
// Converts raw PostgREST/Postgres errors into actionable UI content.

export interface FriendlyTemplateError {
  title: string;
  message: string;
  nextSteps: string[];
  code?: string;
  hint?: string;
  details?: string;
  rawMessage?: string;
}

export function toFriendlyTemplateError(error: any): FriendlyTemplateError {
  const code: string | undefined = error?.code;
  const rawMessage: string = error?.message || String(error || "");
  const hint: string | undefined = error?.hint;
  const details: string | undefined = error?.details;
  const lowered = rawMessage.toLowerCase();

  // Permission denied (missing Data API GRANT or RLS violation)
  if (
    code === "42501" ||
    lowered.includes("permission denied") ||
    lowered.includes("row-level security") ||
    lowered.includes("violates row-level security")
  ) {
    return {
      title: "You don't have permission to save this template",
      message:
        "The server rejected the save because your account isn't allowed to write to the templates table right now. This is usually a session or permissions issue, not a bug in the template itself.",
      nextSteps: [
        "Sign out and sign back in to refresh your session.",
        "Confirm you're logged in with the account that owns this card.",
        "If the problem persists, send the technical details below to an admin.",
      ],
      code,
      hint,
      details,
      rawMessage,
    };
  }

  // Unique violation (template name collision)
  if (code === "23505") {
    return {
      title: "A template with that name already exists",
      message: "Template names must be unique within your account.",
      nextSteps: ["Choose a different name and try again."],
      code,
      hint,
      details,
      rawMessage,
    };
  }

  // Auth / JWT issues
  if (
    code === "PGRST301" ||
    lowered.includes("jwt") ||
    lowered.includes("invalid token") ||
    lowered.includes("not authenticated")
  ) {
    return {
      title: "Your session has expired",
      message: "We couldn't verify your login. Please sign in again to save the template.",
      nextSteps: ["Sign out, then sign back in.", "Try saving the template again."],
      code,
      hint,
      details,
      rawMessage,
    };
  }

  // Network failures
  if (lowered.includes("failed to fetch") || lowered.includes("networkerror") || lowered.includes("network request failed")) {
    return {
      title: "Can't reach the server",
      message: "Your device couldn't connect to Card-Ex. This is usually a network issue.",
      nextSteps: [
        "Check your internet connection.",
        "Wait a moment, then click Try Again.",
      ],
      code,
      hint,
      details,
      rawMessage,
    };
  }

  // Validation / size errors
  if (code === "22001" || lowered.includes("value too long")) {
    return {
      title: "Some content is too long",
      message: "One of the fields exceeds the allowed length.",
      nextSteps: ["Shorten the template name or description, then try again."],
      code,
      hint,
      details,
      rawMessage,
    };
  }

  // Fallback
  return {
    title: "Couldn't save the template",
    message: rawMessage || "An unexpected error occurred while saving.",
    nextSteps: [
      "Click Try Again — this often resolves transient issues.",
      "If it keeps failing, copy the technical details below and send them to support.",
    ],
    code,
    hint,
    details,
    rawMessage,
  };
}

export function formatErrorDetails(err: FriendlyTemplateError): string {
  const parts: string[] = [];
  if (err.code) parts.push(`Code: ${err.code}`);
  if (err.rawMessage) parts.push(`Message: ${err.rawMessage}`);
  if (err.hint) parts.push(`Hint: ${err.hint}`);
  if (err.details) parts.push(`Details: ${err.details}`);
  return parts.join("\n");
}
