-- ============================================================================
-- Migration: 028_create_messaging_system.sql
-- Description: Create messaging system tables for user communication
-- Author: Cascade AI
-- Date: 2025-01-07
-- ============================================================================

-- Check if table exists and handle accordingly
DO $$
BEGIN
  -- If table doesn't exist, create it
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pg_messages') THEN
    CREATE TABLE public.pg_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id UUID NOT NULL REFERENCES public.pg_profiles(id) ON DELETE CASCADE,
        recipient_id UUID NOT NULL REFERENCES public.pg_profiles(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
        thread_id UUID,
        parent_message_id UUID REFERENCES public.pg_messages(id),
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        read_at TIMESTAMPTZ,
        deleted_at TIMESTAMPTZ
    );
  ELSE
    -- Table exists, add missing columns if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_messages' AND column_name = 'message_type') THEN
      ALTER TABLE public.pg_messages ADD COLUMN message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system'));
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_messages' AND column_name = 'thread_id') THEN
      ALTER TABLE public.pg_messages ADD COLUMN thread_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_messages' AND column_name = 'parent_message_id') THEN
      ALTER TABLE public.pg_messages ADD COLUMN parent_message_id UUID REFERENCES public.pg_messages(id);
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_messages' AND column_name = 'is_read') THEN
      ALTER TABLE public.pg_messages ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_messages' AND column_name = 'is_deleted') THEN
      ALTER TABLE public.pg_messages ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_messages' AND column_name = 'metadata') THEN
      ALTER TABLE public.pg_messages ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_messages' AND column_name = 'read_at') THEN
      ALTER TABLE public.pg_messages ADD COLUMN read_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_messages' AND column_name = 'deleted_at') THEN
      ALTER TABLE public.pg_messages ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
    
    -- Update foreign key constraints if needed
    BEGIN
      ALTER TABLE public.pg_messages DROP CONSTRAINT IF EXISTS pg_messages_sender_id_fkey;
      ALTER TABLE public.pg_messages ADD CONSTRAINT pg_messages_sender_id_fkey 
        FOREIGN KEY (sender_id) REFERENCES public.pg_profiles(id) ON DELETE CASCADE;
        
      ALTER TABLE public.pg_messages DROP CONSTRAINT IF EXISTS pg_messages_recipient_id_fkey;
      ALTER TABLE public.pg_messages ADD CONSTRAINT pg_messages_recipient_id_fkey 
        FOREIGN KEY (recipient_id) REFERENCES public.pg_profiles(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
      -- Ignore if constraints already exist or other issues
      NULL;
    END;
  END IF;
END $$;

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_pg_messages_sender_id ON public.pg_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_pg_messages_recipient_id ON public.pg_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_pg_messages_thread_id ON public.pg_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_pg_messages_created_at ON public.pg_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_pg_messages_is_read ON public.pg_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_pg_messages_is_deleted ON public.pg_messages(is_deleted);

-- Create updated_at trigger for messages
CREATE OR REPLACE FUNCTION update_pg_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger before creating new one
DROP TRIGGER IF EXISTS trigger_pg_messages_updated_at ON public.pg_messages;
CREATE TRIGGER trigger_pg_messages_updated_at
    BEFORE UPDATE ON public.pg_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_pg_messages_updated_at();

-- Function to mark message as read
CREATE OR REPLACE FUNCTION mark_message_as_read(message_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.pg_messages 
    SET is_read = TRUE, read_at = NOW()
    WHERE id = message_id 
    AND recipient_id = user_id 
    AND is_read = FALSE;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on messages
ALTER TABLE public.pg_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can access their own messages" ON public.pg_messages;

-- Policy: Users can access messages they sent or received
CREATE POLICY "Users can access their own messages" ON public.pg_messages
    FOR ALL USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pg_messages TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.pg_messages IS 'Messages between users in the marketplace';
COMMENT ON COLUMN public.pg_messages.thread_id IS 'Groups related messages together';
COMMENT ON COLUMN public.pg_messages.parent_message_id IS 'Reference to message being replied to';
