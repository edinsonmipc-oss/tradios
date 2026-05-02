-- ══════════════════════════════════════════════════════════
-- TRADIOS - SQL Migration para agregar columnas faltantes
-- ══════════════════════════════════════════════════════════
-- Ejecuta esto en el SQL Editor de Supabase Dashboard:
-- https://supabase.com/dashboard/project/mpgrsobnxpumzyabomaz/sql/new
-- ══════════════════════════════════════════════════════════

-- =========================================================
-- 1. CLIENTS - Agregar columnas faltantes
-- =========================================================
ALTER TABLE clients 
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook TEXT DEFAULT '';

-- =========================================================
-- 2. QUOTES - Agregar columnas faltantes
-- =========================================================
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS gst DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS materials JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS terms TEXT DEFAULT 'Payment due within 14 days.',
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS response_at TIMESTAMPTZ;

-- =========================================================
-- 3. VISITS - Agregar columnas faltantes
-- =========================================================
ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS measurements JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =========================================================
-- 4. EXPENSES - Agregar columnas faltantes
-- =========================================================
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_incurred TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tax_deductible BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =========================================================
-- 5. GALLERY - Agregar columnas faltantes
-- =========================================================
ALTER TABLE gallery
  ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Note: gallery.image_url doesn't exist, but gallery.url does.
-- If you want an image_url column, run:
-- ALTER TABLE gallery RENAME COLUMN url TO image_url;

-- =========================================================
-- 6. MESSAGES - Agregar columnas faltantes
-- =========================================================
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'sms',
  ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'sms',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =========================================================
-- 7. PROFILES - Agregar columnas faltantes
-- =========================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- =========================================================
-- 8. Add updated_at triggers (optional but recommended)
-- =========================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables that now have updated_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='updated_at') THEN
    CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='updated_at') THEN
    CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='updated_at') THEN
    CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visits' AND column_name='updated_at') THEN
    CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='updated_at') THEN
    CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gallery' AND column_name='updated_at') THEN
    CREATE TRIGGER update_gallery_updated_at BEFORE UPDATE ON gallery FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
