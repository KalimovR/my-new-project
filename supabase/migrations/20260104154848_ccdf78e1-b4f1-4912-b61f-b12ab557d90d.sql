-- Add deleted_at column for soft delete functionality
ALTER TABLE public.discussions 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update RLS policy to hide deleted discussions from regular users
DROP POLICY IF EXISTS "Anyone can view active discussions" ON public.discussions;
CREATE POLICY "Anyone can view active discussions" 
ON public.discussions 
FOR SELECT 
USING (is_active = true AND deleted_at IS NULL);

-- Update admin policy to see all including deleted
DROP POLICY IF EXISTS "Admins and editors can view all discussions" ON public.discussions;
CREATE POLICY "Admins and editors can view all discussions" 
ON public.discussions 
FOR SELECT 
USING (is_admin_or_editor(auth.uid()));