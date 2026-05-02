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
  ADD COLUMN IF NOT EXISTS facebook TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

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
-- 7. PROFILES - Información del negocio (campos completos)
-- =========================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS business_description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS services TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS years_in_business INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS license_number TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS insurance_details TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS tiktok TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =========================================================
-- 8. SEO - Tabla para SEO de la app (opcional)
-- =========================================================
CREATE TABLE IF NOT EXISTS seo_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meta_title TEXT DEFAULT '',
  meta_description TEXT DEFAULT '',
  meta_keywords TEXT DEFAULT '',
  google_site_verification TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on seo_settings
ALTER TABLE seo_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for seo_settings
CREATE POLICY "Users can view own SEO settings"
  ON seo_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own SEO settings"
  ON seo_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own SEO settings"
  ON seo_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- 9. Add updated_at triggers (optional but recommended)
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
