-- Create tools table for the Tools Repository feature
CREATE TABLE public.tools (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'General',
  tool_url text NOT NULL,
  visibility text NOT NULL DEFAULT 'all_members',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

-- Create policy: Only authenticated users can read active tools
CREATE POLICY "Authenticated users can view active tools"
ON public.tools
FOR SELECT
USING (auth.role() = 'authenticated');

-- Create policy: Only admins can manage tools
CREATE POLICY "Admins can manage all tools"
ON public.tools
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tools_updated_at
BEFORE UPDATE ON public.tools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for common queries
CREATE INDEX idx_tools_category ON public.tools(category);
CREATE INDEX idx_tools_is_active ON public.tools(is_active);