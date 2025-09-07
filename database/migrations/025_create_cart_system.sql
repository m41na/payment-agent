-- Migration: Create Cart System
-- Description: Creates pg_cart_items table for user shopping cart functionality
-- Dependencies: Requires pg_profiles table from base schema

-- Check if table exists and handle accordingly
DO $$
BEGIN
  -- If table doesn't exist, create it
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pg_cart_items') THEN
    CREATE TABLE public.pg_cart_items (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES public.pg_profiles(id) ON DELETE CASCADE,
      product_id UUID NOT NULL,
      product_type TEXT NOT NULL DEFAULT 'product', -- 'product', 'event', 'service'
      quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
      unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
      total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
      product_snapshot JSONB, -- Store product details at time of adding to cart
      metadata JSONB DEFAULT '{}',
      added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      -- Ensure user can't add same product twice (use quantity instead)
      UNIQUE(user_id, product_id, product_type)
    );
  ELSE
    -- Table exists, add missing columns if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_cart_items' AND column_name = 'added_at') THEN
      ALTER TABLE public.pg_cart_items ADD COLUMN added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_cart_items' AND column_name = 'updated_at') THEN
      ALTER TABLE public.pg_cart_items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_cart_items' AND column_name = 'product_type') THEN
      ALTER TABLE public.pg_cart_items ADD COLUMN product_type TEXT NOT NULL DEFAULT 'product';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_cart_items' AND column_name = 'unit_price') THEN
      ALTER TABLE public.pg_cart_items ADD COLUMN unit_price DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0);
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_cart_items' AND column_name = 'total_price') THEN
      ALTER TABLE public.pg_cart_items ADD COLUMN total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_cart_items' AND column_name = 'product_snapshot') THEN
      ALTER TABLE public.pg_cart_items ADD COLUMN product_snapshot JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pg_cart_items' AND column_name = 'metadata') THEN
      ALTER TABLE public.pg_cart_items ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
    
    -- Update foreign key constraint if needed (drop and recreate)
    BEGIN
      ALTER TABLE public.pg_cart_items DROP CONSTRAINT IF EXISTS pg_cart_items_user_id_fkey;
      ALTER TABLE public.pg_cart_items ADD CONSTRAINT pg_cart_items_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.pg_profiles(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
      -- Ignore if constraint already exists or other issues
      NULL;
    END;
  END IF;
END $$;

-- Create indexes for better performance (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_pg_cart_items_user_id ON public.pg_cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_pg_cart_items_product_id ON public.pg_cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_pg_cart_items_added_at ON public.pg_cart_items(added_at);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.pg_update_cart_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS pg_cart_items_updated_at ON public.pg_cart_items;
CREATE TRIGGER pg_cart_items_updated_at
  BEFORE UPDATE ON public.pg_cart_items
  FOR EACH ROW EXECUTE FUNCTION public.pg_update_cart_items_updated_at();

-- Enable Row Level Security
ALTER TABLE public.pg_cart_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own cart items" ON public.pg_cart_items;
DROP POLICY IF EXISTS "Users can insert own cart items" ON public.pg_cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON public.pg_cart_items;
DROP POLICY IF EXISTS "Users can delete own cart items" ON public.pg_cart_items;

-- Create RLS policies
CREATE POLICY "Users can view own cart items" ON public.pg_cart_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart items" ON public.pg_cart_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart items" ON public.pg_cart_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart items" ON public.pg_cart_items
  FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pg_cart_items TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.pg_cart_items IS 'Shopping cart items for users with product snapshots and pricing';
COMMENT ON COLUMN public.pg_cart_items.product_snapshot IS 'JSONB snapshot of product details at time of adding to cart';
COMMENT ON COLUMN public.pg_cart_items.added_at IS 'Timestamp when item was added to cart';