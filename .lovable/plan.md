## Diagnosis

Card users are likely failing to save templates because the `card_templates` table currently has no Data API grants for `anon`, `authenticated`, or `service_role`. Even with RLS policies present, Supabase/PostgREST still requires explicit table privileges. The live database query showed an empty grant list for `card_templates`, so browser inserts can be rejected before the existing “Users can create templates” policy is useful.

There is also a second possible issue: the current insert policy is assigned to `public` instead of explicitly to `authenticated`. It may work in some cases, but making it explicit is safer and matches the current Supabase guidance.

## Plan

1. **Add missing database grants for `card_templates`**
   - Allow logged-in users to view, create, update, and delete templates through the app.
   - Allow service-role access for admin/backend operations.
   - Do not grant anonymous write access.

2. **Tighten template RLS policies**
   - Replace the broad/public create policy with an explicit authenticated-only policy.
   - Keep users limited to templates where `owner_id = auth.uid()`.
   - Preserve admin access through `is_super_admin(auth.uid())`.

3. **Improve the frontend error message**
   - Update template save error handling so it shows the real Supabase error in the console and a clearer toast for the user instead of only “Failed to save template”.
   - Keep the UI behavior and template visibility choices unchanged.

4. **Verify after approval**
   - Re-check the live grants and RLS policies.
   - Confirm the save flow is no longer blocked by table permissions.