-- Migration 15: RLS cross-user notifications
-- Enables admin to insert notifications for any user_id
-- and allows admin to see all notifications in history view

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authenticated_insert_notifications ON public.notifications;
CREATE POLICY authenticated_insert_notifications ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS user_select_own_notifications ON public.notifications;
CREATE POLICY user_select_own_notifications ON public.notifications FOR SELECT TO authenticated USING (public.is_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS user_update_own_notifications ON public.notifications;
CREATE POLICY user_update_own_notifications ON public.notifications FOR UPDATE TO authenticated USING (public.is_admin() OR user_id = auth.uid()) WITH CHECK (true);
