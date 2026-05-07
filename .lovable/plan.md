## Problem

The "Create New Card" dialog launched from the Dashboard (`NewCardDialog`) creates a card immediately when the user clicks **Build from Scratch** or picks a template — no required fields are validated. This is inconsistent with the Onboarding wizard (`/onboarding`), which already enforces First Name, Last Name, Mobile, Email, Facebook URL, IAM membership/ID, and template selection before enabling the submit button.

## Fix

Bring the Dashboard's create-card flow to parity with Onboarding so the **Create Card** button is disabled until every required field is valid.

### Changes in `src/components/templates/NewCardDialog.tsx`

1. Replace the current two-card "choice" step (Build from Scratch vs Use a Template) with a single form identical to the Onboarding wizard:
   - First Name * (prefill from `profileName`)
   - Last Name * (prefill)
   - Mobile Number *
   - Email Address * (prefill from `user.email`)
   - Facebook Link * (validated as facebook.com / fb.com / fb.me URL)
   - IAM Worldwide Member? Yes/No, with IAM ID * (8 digits) shown when Yes
   - Starting template * (opens `TemplateSelectionModal`; "Build from Scratch" available as a chip inside the picker)

2. Reuse the same `zod` schema and disabled-button logic from `Onboarding.tsx`:
   ```
   const submitDisabled = submitting || iamIdMissing || templateMissing || !formValid;
   ```
   The "Create Card" button uses `disabled={submitDisabled}` and re-evaluates live as fields change (already proven to work after the previous Onboarding fix).

3. On submit, build the card using the same logic Onboarding uses (template snapshot + IAM URL substitution + override of identity/contact fields + Facebook social link + `card_links` insertion), then navigate to `/cards/:id/edit`.

4. Keep the existing card-limit error handling and `DEFAULT_THEME` merge.

### Shared helper (small refactor)

To avoid duplicating ~150 lines of card-build logic between `Onboarding.tsx` and `NewCardDialog.tsx`, extract the shared submit logic into `src/lib/createCardFromOnboarding.ts`:

```text
createCardFromOnboarding({
  user, profileUpdate?: boolean,
  firstName, lastName, phone, email, facebookUrl,
  isIamMember, iamId, selectedTemplate
}) -> { cardId }
```

- `Onboarding.tsx` calls it with `profileUpdate: true` (also writes `profiles.onboarding_completed_at`).
- `NewCardDialog.tsx` calls it with `profileUpdate: false`.

### Result

From the Dashboard, clicking "+ Create New Card" opens a dialog where:
- Removing the email or Facebook link re-disables **Create Card** instantly.
- Missing IAM ID (when "Yes" is selected) keeps the button disabled.
- Not picking a template keeps the button disabled.
- Only when every required field is valid does the button become clickable — matching the corrected Onboarding behavior.

No other files need changes.