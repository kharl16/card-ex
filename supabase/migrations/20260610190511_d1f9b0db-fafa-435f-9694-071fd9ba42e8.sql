-- Grant Data API privileges on card_templates so authenticated users can save templates
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_templates TO authenticated;
GRANT ALL ON public.card_templates TO service_role;

-- Replace the insert policy to be explicit to authenticated role
DROP POLICY IF EXISTS "Users can create templates" ON public.card_templates;
CREATE POLICY "Users can create templates"
ON public.card_templates
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Also scope update/delete to authenticated
DROP POLICY IF EXISTS "Users can update their own templates" ON public.card_templates;
CREATE POLICY "Users can update their own templates"
ON public.card_templates
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete their own templates" ON public.card_templates;
CREATE POLICY "Users can delete their own templates"
ON public.card_templates
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);