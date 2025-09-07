-- ============================================================================
-- Migration: 029_fix_messages_column_name.sql
-- Description: Rename recipient_id to receiver_id in pg_messages table to match frontend code
-- Author: Cascade AI
-- Date: 2025-01-07
-- ============================================================================

-- Check if the column rename is needed
DO $$
BEGIN
  -- Only proceed if recipient_id exists and receiver_id doesn't
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_messages' AND column_name = 'recipient_id')
     AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_messages' AND column_name = 'receiver_id') THEN
    
    -- Drop existing policies that reference recipient_id
    DROP POLICY IF EXISTS "Users can access their own messages" ON public.pg_messages;
    
    -- Drop existing foreign key constraint
    ALTER TABLE public.pg_messages DROP CONSTRAINT IF EXISTS pg_messages_recipient_id_fkey;
    
    -- Drop existing index
    DROP INDEX IF EXISTS idx_pg_messages_recipient_id;
    
    -- Rename the column
    ALTER TABLE public.pg_messages RENAME COLUMN recipient_id TO receiver_id;
    
    -- Recreate foreign key constraint with new column name
    ALTER TABLE public.pg_messages ADD CONSTRAINT pg_messages_receiver_id_fkey 
      FOREIGN KEY (receiver_id) REFERENCES public.pg_profiles(id) ON DELETE CASCADE;
    
    -- Recreate index with new column name
    CREATE INDEX idx_pg_messages_receiver_id ON public.pg_messages(receiver_id);
    
    -- Recreate RLS policy with new column name
    CREATE POLICY "Users can access their own messages" ON public.pg_messages
      FOR ALL USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
    
  END IF;
END $$;

-- Update the mark_message_as_read function (outside the DO block)
CREATE OR REPLACE FUNCTION mark_message_as_read(message_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.pg_messages 
    SET is_read = TRUE, read_at = NOW()
    WHERE id = message_id 
    AND receiver_id = user_id 
    AND is_read = FALSE;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

-- Migration completed: Renamed recipient_id to receiver_id in pg_messages table to match frontend code expectations
