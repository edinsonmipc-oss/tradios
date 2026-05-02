import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const sqlCommands = `
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Public Access" ON storage.objects;
      DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
      DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
      DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;

      CREATE POLICY "Public Access" ON storage.objects
        FOR SELECT USING (bucket_id IN ('profiles', 'gallery', 'receipts'));

      CREATE POLICY "Auth Upload" ON storage.objects
        FOR INSERT WITH CHECK (
          auth.role() = 'authenticated'
          AND bucket_id IN ('profiles', 'gallery', 'receipts')
        );

      CREATE POLICY "Auth Update" ON storage.objects
        FOR UPDATE USING (
          auth.role() = 'authenticated'
          AND bucket_id IN ('profiles', 'gallery', 'receipts')
          AND (owner = auth.uid() OR owner IS NULL)
        );

      CREATE POLICY "Auth Delete" ON storage.objects
        FOR DELETE USING (
          auth.role() = 'authenticated'
          AND bucket_id IN ('profiles', 'gallery', 'receipts')
          AND (owner = auth.uid() OR owner IS NULL)
        );
    `

    // Execute via raw SQL endpoint
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      }
    )

    // Direct storage admin API to check existing policies
    const bucketCheck = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/bucket/profiles`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        }
      }
    )
    const bucketInfo = await bucketCheck.json()

    return NextResponse.json({
      status: 'ok',
      message: 'Storage setup initialized. Buckets already created.',
      buckets: bucketInfo,
      note: 'RLS policies need to be created via Supabase SQL Editor. Run the SQL in supabase-schema-storage.sql'
    })
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
  }
}
