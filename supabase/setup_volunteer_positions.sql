-- Create the volunteer_positions table.
-- Run this in the Supabase SQL Editor.
--
-- involved and requirements are stored as newline-separated text.
-- Each line becomes one bullet point on the public Get Involved page.

CREATE TABLE IF NOT EXISTS volunteer_positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  commitment TEXT NOT NULL,
  involved TEXT NOT NULL DEFAULT '',
  requirements TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Allow anyone to read active positions (public Get Involved page)
ALTER TABLE volunteer_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active positions"
ON volunteer_positions FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Authenticated staff can manage positions"
ON volunteer_positions FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Seed with the 5 current positions
INSERT INTO volunteer_positions (title, commitment, involved, requirements, is_active, display_order) VALUES
(
  'Volunteer Driver',
  'Flexible Hours',
  'Driving electric automatic vehicles
Supporting residents to appointments, shopping and social events
Door-to-door service across Plas Madoc and South Wrexham
Full clean driving licence required',
  'Full clean UK driving licence
Friendly and patient manner
DBS check (we''ll arrange this)',
  true, 1
),
(
  'Kettle Club Helper',
  'Weekly',
  'Helping prepare breakfast and refreshments
Setting up and clearing the social space
Welcoming residents and starting conversations
Compassionate and friendly manner needed',
  'No experience needed
Warm and approachable personality
Reliable availability',
  true, 2
),
(
  'Homegrown Helper',
  'Flexible',
  'Supporting community meals and activities
Helping in the kitchen or with food preparation
Welcoming residents and creating a warm atmosphere
Assisting with groups, workshops and events',
  'No experience needed
Enthusiasm for community and food
Friendly and inclusive attitude',
  true, 3
),
(
  'Community Pantry Volunteer',
  'Regular sessions',
  'Welcoming residents and helping them choose items
Stocking shelves and organising produce
Accepting and sorting food donations and deliveries
Providing a friendly, dignified experience for all visitors',
  'No experience needed
Organised and reliable
Non-judgmental and welcoming',
  true, 4
),
(
  'Playworker Support (The Land)',
  'Sessional',
  'Supporting children to explore and play freely
Monitoring safety while encouraging risk and independence
Maintaining the play environment and loose parts
Working alongside our trained playworkers',
  'Enthusiasm for child-led play
DBS check (we''ll arrange this)
Playwork experience helpful but not essential',
  true, 5
);
