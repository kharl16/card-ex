
-- Enable RLS on IAM Files
ALTER TABLE public."IAM Files" ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all IAM Files
CREATE POLICY "Authenticated can view IAM Files"
ON public."IAM Files"
FOR SELECT
USING (auth.role() = 'authenticated');

-- Admins can manage IAM Files
CREATE POLICY "Admins can manage IAM Files"
ON public."IAM Files"
FOR ALL
USING (is_resource_admin(auth.uid()))
WITH CHECK (is_resource_admin(auth.uid()));

-- Public can view IAM Files (for public card views)
CREATE POLICY "Public can view IAM Files"
ON public."IAM Files"
FOR SELECT
USING (true);
