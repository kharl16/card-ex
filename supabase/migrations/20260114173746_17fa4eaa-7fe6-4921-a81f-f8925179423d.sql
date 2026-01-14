-- Fix overly permissive share_links_manage policy (WITH CHECK true)
-- This policy governs INSERT/UPDATE/DELETE; WITH CHECK must enforce the same authorization as USING.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'share_links'
      AND policyname = 'share_links_manage'
  ) THEN
    EXECUTE 'DROP POLICY share_links_manage ON public.share_links';
  END IF;
END $$;

CREATE POLICY share_links_manage
ON public.share_links
FOR ALL
TO public
USING (
  (
    EXISTS (
      SELECT 1
      FROM public.cards c
      WHERE c.id = share_links.card_id
        AND (
          c.user_id = auth.uid()
          OR (
            c.organization_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.memberships m
              WHERE m.organization_id = c.organization_id
                AND m.user_id = auth.uid()
                AND m.role = ANY (ARRAY['admin'::public.app_role, 'owner'::public.app_role])
            )
          )
        )
    )
  )
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  (
    EXISTS (
      SELECT 1
      FROM public.cards c
      WHERE c.id = share_links.card_id
        AND (
          c.user_id = auth.uid()
          OR (
            c.organization_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.memberships m
              WHERE m.organization_id = c.organization_id
                AND m.user_id = auth.uid()
                AND m.role = ANY (ARRAY['admin'::public.app_role, 'owner'::public.app_role])
            )
          )
        )
    )
  )
  OR public.is_super_admin(auth.uid())
);
