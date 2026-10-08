-- ============================================================
-- Yangi rol: "boshlangich_oqituvchi" (Boshlang'ich sinf o'qituvchisi)
-- staff.role CHECK cheklovini yangi rol bilan qayta yaratamiz.
-- ============================================================
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;

ALTER TABLE staff ADD CONSTRAINT staff_role_check
  CHECK (role IN (
    'admin','director','mudir','zam_direktor','zavuch',
    'sinf_rahbari','teacher','kutubxonachi','boshlangich_oqituvchi'
  ));
