-- Tradeos - Schema Update: Expenses Table + Client Social Links
-- Run this in your Supabase SQL Editor to add new features to an existing project

-- Add social links columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS instagram TEXT DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS facebook TEXT DEFAULT '';

-- Expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  receipt_url TEXT,
  vendor TEXT NOT NULL DEFAULT '',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  gst_amount DECIMAL(10,2) DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('materials','tools','fuel','vehicle','insurance','office','subcontractor','other')),
  description TEXT DEFAULT '',
  date_incurred TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  tax_deductible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policies: users can only see their own data
CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON expenses FOR DELETE USING (auth.uid() = user_id);
