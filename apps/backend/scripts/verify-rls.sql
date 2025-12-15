-- Verification script for RLS policies
-- Run this in Supabase SQL Editor to verify RLS is properly configured

-- 1. Check RLS is enabled on all tables
SELECT 
  c.relname as table_name,
  CASE WHEN c.relrowsecurity THEN 'YES' ELSE 'NO' END as rls_enabled,
  CASE WHEN c.relforcerowsecurity THEN 'YES' ELSE 'NO' END as rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relkind = 'r'
  AND c.relname IN (
    'User', 'Organization', 'OrganizationMember', 'OrganizationCustomer',
    'Project', 'Media', 'Message', 'CalendarEvent', 'Invitation', 'Inquiry'
  )
ORDER BY c.relname;

-- 2. List all RLS policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  qual as using_expression
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Verify helper function exists
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'get_current_user_id';




