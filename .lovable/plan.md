
## Goal
When saving a template fails, the user currently sees a generic toast. Replace this with a clear, actionable error UI that shows the real Supabase error and tells the user what to do next.

## Changes

### 1. `src/hooks/useTemplates.ts`
- In `saveAsGlobalTemplate`, `savePersonalTemplate`, and the shared save path, instead of only `toast.error(msg)`:
  - Return a structured result `{ success: boolean, error?: { message, code, hint, details } }` from save functions (or attach the last error to the hook state).
  - Keep the toast as a fallback, but include the Postgres `code` (e.g. `42501`, `23505`) so it's identifiable.
- Map common Supabase error codes to friendly explanations + next steps:
  - `42501` / "permission denied" → "Your account doesn't have permission to save templates yet. Please sign out and sign back in, or contact an admin."
  - `23505` (unique violation) → "A template with this name already exists. Try a different name."
  - `PGRST301` / JWT issues → "Your session expired. Please sign in again."
  - Network/`Failed to fetch` → "Couldn't reach the server. Check your internet connection and retry."
  - Unknown → show raw message + code.

### 2. `src/components/templates/SaveTemplateDialog.tsx`
- Add local `saveError` state (`{ title, message, hint, code, raw } | null`).
- On failed save, instead of just closing/keeping the dialog open with a toast, render an inline error panel inside the dialog:
  - Red `Alert` (shadcn) at the top of the dialog body with:
    - Bold title (friendly summary based on error code).
    - Plain-language explanation.
    - "Next steps" bullet list (1-3 concrete actions: sign out/in, rename, retry, contact admin).
    - Collapsible "Technical details" showing the raw Supabase `message`, `code`, `hint`, `details` — with a "Copy details" button so the user can send it to support.
  - A "Try again" primary button and "Cancel" secondary button.
- Clear `saveError` when the user edits the name/description or closes the dialog.
- Keep the existing success path unchanged.

### 3. (Optional, small) `src/components/templates/AdminTemplateManager.tsx`
- Apply the same error-display pattern to the edit/delete flows so admins get the same clarity. Low priority — include only if trivial.

## Out of scope
- No DB/migration changes (grants were fixed in the prior migration).
- No changes to template save business logic; only error surfacing/UX.

## Verification
- Temporarily force a failure (e.g. invalid name length / simulate by revoking grants in a scratch test) and confirm the dialog shows the friendly message + raw details + Copy button.
- Confirm successful saves still close the dialog and toast success.
- TypeScript build passes.
