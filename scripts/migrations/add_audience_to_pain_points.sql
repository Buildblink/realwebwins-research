-- Migration: Add audience column to pain_points table
-- Phase 3.5: Consumer Pain Points Expansion
-- Created: 2025-10-21

-- Add audience column with default value 'creator'
ALTER TABLE public.pain_points
ADD COLUMN audience text DEFAULT 'creator';

-- Add check constraint to ensure only valid values
ALTER TABLE public.pain_points
ADD CONSTRAINT pain_points_audience_check
CHECK (audience IN ('creator', 'consumer'));

-- Create index for audience filtering
CREATE INDEX idx_pain_points_audience ON public.pain_points(audience);

-- Update existing records to have 'creator' audience (they already default to it)
UPDATE public.pain_points
SET audience = 'creator'
WHERE audience IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.pain_points.audience IS 'Type of pain point: creator (supply-side) or consumer (demand-side)';
