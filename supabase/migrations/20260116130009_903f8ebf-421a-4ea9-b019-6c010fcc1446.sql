-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 
  'documents', 
  false,
  10485760, -- 10MB max file size
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Storage policies for documents bucket
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Users with roles can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND (
    public.is_admin() OR 
    public.is_agent() OR 
    public.is_validator()
  )
);

CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND public.is_admin());

CREATE POLICY "Admins and agents can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents' AND public.is_admin_or_agent());

-- Create notifications table for real-time alerts
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() OR public.is_agent());

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Admins can delete notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (public.is_admin());

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function for automatic notifications on pending documents
CREATE OR REPLACE FUNCTION public.notify_pending_document()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT ur.user_id, 
           'Nouveau document en attente', 
           'Un document nécessite votre vérification: ' || NEW.file_name,
           'warning',
           '/documents'
    FROM public.user_roles ur
    WHERE ur.role IN ('admin', 'validator');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for document notifications
CREATE TRIGGER on_document_pending
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_pending_document();

-- Create function for automatic notifications on new reimbursements
CREATE OR REPLACE FUNCTION public.notify_new_reimbursement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT ur.user_id,
           'Nouvelle demande de remboursement',
           'Demande ' || NEW.reference_number || ' - ' || NEW.amount_requested || ' TND',
           'info',
           '/remboursements'
    FROM public.user_roles ur
    WHERE ur.role IN ('admin', 'agent');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for reimbursement notifications
CREATE TRIGGER on_reimbursement_pending
  AFTER INSERT ON public.reimbursements
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_reimbursement();