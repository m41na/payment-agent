-- Migration: Create Event Attendees System
-- Description: Creates pg_event_attendees table for RSVP functionality
-- Dependencies: Requires pg_profiles table from base schema and pg_events table

-- Check if table exists and handle accordingly
DO $$
BEGIN
  -- If table doesn't exist, create it
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pg_event_attendees') THEN
    CREATE TABLE public.pg_event_attendees (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      event_id UUID NOT NULL REFERENCES public.pg_events(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES public.pg_profiles(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled')),
      rsvp_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      attendance_confirmed BOOLEAN DEFAULT FALSE,
      attendance_date TIMESTAMP WITH TIME ZONE,
      notes TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      -- Ensure user can only RSVP once per event
      UNIQUE(event_id, user_id)
    );
  ELSE
    -- Table exists, add missing columns if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_event_attendees' AND column_name = 'attendance_confirmed') THEN
      ALTER TABLE public.pg_event_attendees ADD COLUMN attendance_confirmed BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_event_attendees' AND column_name = 'attendance_date') THEN
      ALTER TABLE public.pg_event_attendees ADD COLUMN attendance_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_event_attendees' AND column_name = 'notes') THEN
      ALTER TABLE public.pg_event_attendees ADD COLUMN notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_event_attendees' AND column_name = 'metadata') THEN
      ALTER TABLE public.pg_event_attendees ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_event_attendees' AND column_name = 'created_at') THEN
      ALTER TABLE public.pg_event_attendees ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_event_attendees' AND column_name = 'updated_at') THEN
      ALTER TABLE public.pg_event_attendees ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Update foreign key constraints if needed
    BEGIN
      ALTER TABLE public.pg_event_attendees DROP CONSTRAINT IF EXISTS pg_event_attendees_user_id_fkey;
      ALTER TABLE public.pg_event_attendees ADD CONSTRAINT pg_event_attendees_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.pg_profiles(id) ON DELETE CASCADE;
        
      ALTER TABLE public.pg_event_attendees DROP CONSTRAINT IF EXISTS pg_event_attendees_event_id_fkey;
      ALTER TABLE public.pg_event_attendees ADD CONSTRAINT pg_event_attendees_event_id_fkey 
        FOREIGN KEY (event_id) REFERENCES public.pg_events(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
      -- Ignore if constraints already exist or other issues
      NULL;
    END;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pg_event_attendees_event_id ON public.pg_event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_pg_event_attendees_user_id ON public.pg_event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_pg_event_attendees_status ON public.pg_event_attendees(status);
CREATE INDEX IF NOT EXISTS idx_pg_event_attendees_rsvp_date ON public.pg_event_attendees(rsvp_date);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.pg_update_event_attendees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS pg_event_attendees_updated_at ON public.pg_event_attendees;
CREATE TRIGGER pg_event_attendees_updated_at
  BEFORE UPDATE ON public.pg_event_attendees
  FOR EACH ROW EXECUTE FUNCTION public.pg_update_event_attendees_updated_at();

-- Create function to maintain attendee count on events table (if attendee_count column exists)
CREATE OR REPLACE FUNCTION public.pg_update_event_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if attendee_count column exists before updating
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_events' AND column_name = 'attendee_count') THEN
    -- Update attendee count for the affected event
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      UPDATE public.pg_events 
      SET attendee_count = (
        SELECT COUNT(*) 
        FROM public.pg_event_attendees 
        WHERE event_id = NEW.event_id AND status = 'confirmed'
      )
      WHERE id = NEW.event_id;
      RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.pg_events 
      SET attendee_count = (
        SELECT COUNT(*) 
        FROM public.pg_event_attendees 
        WHERE event_id = OLD.event_id AND status = 'confirmed'
      )
      WHERE id = OLD.event_id;
      RETURN OLD;
    END IF;
  END IF;
  
  -- If no attendee_count column, just return without error
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for maintaining attendee count
DROP TRIGGER IF EXISTS pg_event_attendees_count_trigger ON public.pg_event_attendees;
CREATE TRIGGER pg_event_attendees_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.pg_event_attendees
  FOR EACH ROW EXECUTE FUNCTION public.pg_update_event_attendee_count();

-- Create RPC function for updating attendee count (called by RSVPService)
CREATE OR REPLACE FUNCTION public.update_event_attendee_count(
  event_id UUID,
  count_change INTEGER
)
RETURNS void AS $$
BEGIN
  -- Check if current_attendees column exists before updating
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_events' AND column_name = 'current_attendees') THEN
    UPDATE public.pg_events 
    SET current_attendees = GREATEST(0, COALESCE(current_attendees, 0) + count_change)
    WHERE id = event_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_event_attendee_count(UUID, INTEGER) TO authenticated;

-- Enable Row Level Security
ALTER TABLE public.pg_event_attendees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view event attendees for public events" ON public.pg_event_attendees;
DROP POLICY IF EXISTS "Users can view event attendees for active events" ON public.pg_event_attendees;
DROP POLICY IF EXISTS "Users can RSVP to events" ON public.pg_event_attendees;
DROP POLICY IF EXISTS "Users can update own RSVP" ON public.pg_event_attendees;
DROP POLICY IF EXISTS "Users can cancel own RSVP" ON public.pg_event_attendees;
DROP POLICY IF EXISTS "Event organizers can manage attendees" ON public.pg_event_attendees;

-- Create RLS policies (simplified to work with actual pg_events structure)
CREATE POLICY "Users can view event attendees for active events" ON public.pg_event_attendees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pg_events 
      WHERE id = event_id AND (is_active = true OR organizer_id = auth.uid())
    ) OR user_id = auth.uid()
  );

CREATE POLICY "Users can RSVP to events" ON public.pg_event_attendees
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own RSVP" ON public.pg_event_attendees
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can cancel own RSVP" ON public.pg_event_attendees
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Event organizers can manage attendees" ON public.pg_event_attendees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pg_events 
      WHERE id = event_id AND organizer_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pg_event_attendees TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.pg_event_attendees IS 'Event RSVP and attendance tracking system';
COMMENT ON COLUMN public.pg_event_attendees.status IS 'RSVP status: pending, confirmed, declined, cancelled';
COMMENT ON COLUMN public.pg_event_attendees.metadata IS 'Additional RSVP data like dietary restrictions, plus-ones, etc.';