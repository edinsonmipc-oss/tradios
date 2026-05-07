-- ══════════════════════════════════════════════════════════
-- TRADIOS - SQL Migration COMPLETA
-- Ejecutar en: https://supabase.com/dashboard/project/mpgrsobnxpumzyabomaz/sql/new
-- ══════════════════════════════════════════════════════════

-- =========================================================
-- 1. PROFILES - Agregar todas las columnas faltantes
-- =========================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS business_description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS services TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS years_in_business INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS license_number TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS insurance_details TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS tiktok TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS service_area TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS default_hourly_rate DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_helper_rate DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_deposit_pct INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS quote_validity_days INTEGER DEFAULT 14,
  ADD COLUMN IF NOT EXISTS public_liability_note TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS google_review_link TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_sender TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_signature TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =========================================================
-- 2. CLIENTS - Agregar columnas faltantes
-- =========================================================
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook TEXT DEFAULT '';

-- =========================================================
-- 3. QUOTES - Agregar columnas faltantes
-- =========================================================
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS gst DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS materials JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS terms TEXT DEFAULT 'Payment due within 14 days.',
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS response_at TIMESTAMPTZ;

-- =========================================================
-- 4. VISITS - Agregar columnas faltantes
-- =========================================================
ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS measurements JSONB DEFAULT '[]';

-- =========================================================
-- 5. EXPENSES - Agregar columnas faltantes
-- =========================================================
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_incurred TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tax_deductible BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- =========================================================
-- 6. GALLERY - Agregar columnas faltantes
-- =========================================================
ALTER TABLE gallery
  ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- =========================================================
-- 7. MESSAGES - Agregar columnas faltantes
-- =========================================================
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'sms',
  ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'sms';

-- ✅ LISTO - Todas las columnas agregadas
SELECT '✅ Migration completed successfully!' AS status;
