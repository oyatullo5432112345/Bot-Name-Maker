-- mudir rolini staff jadvaliga qo'shish
-- Supabase Dashboard → SQL Editor da ishga tushiring
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;
ALTER TABLE staff ADD CONSTRAINT staff_role_check
  CHECK (role IN ('admin','director','mudir','zam_direktor','zavuch','sinf_rahbari','teacher','kutubxonachi'));
