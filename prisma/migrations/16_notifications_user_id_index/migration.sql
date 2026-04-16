-- Migration 16: Index on notifications.user_id for RLS query performance
-- RLS policies filter by user_id = auth.uid() on every query — without this index
-- Postgres does a full table scan which degrades as notifications grow.
-- See: security-rls-performance best practice

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications(user_id);

-- Composite index for sorted queries (most common: ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at
  ON public.notifications(user_id, created_at DESC);
