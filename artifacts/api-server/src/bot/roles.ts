// Tizimda mavjud rollar
export type Role = "admin" | "director" | "zam_direktor" | "zavuch" | "teacher" | "boshlangich_oqituvchi";

// Rol nomlari (o'zbek tilida)
export const ROLE_NAMES: Record<Role, string> = {
  admin: "👑 Admin",
  director: "🏛️ Direktor",
  zam_direktor: "📋 MMTB",
  zavuch: "📚 O'quv ishlari mudiri",
  teacher: "👨‍🏫 Fan o'qituvchisi",
  boshlangich_oqituvchi: "🎒 Boshlang'ich sinf o'qituvchisi",
};

// Har bir rolning ruxsatlari
export interface Permissions {
  canManageStaff: boolean;       // Xodim qo'shish/o'chirish
  canManageClasses: boolean;     // Sinf yaratish/o'chirish
  canAssignTeacher: boolean;     // Sinf rahbari tayinlash
  canViewAllStudents: boolean;   // Barcha o'quvchilarni ko'rish
  canViewOwnStudents: boolean;   // Faqat o'z sinfini ko'rish
  canBroadcast: boolean;         // Xabar yuborish
  canViewAllStaff: boolean;      // Barcha xodimlarni ko'rish
  canEditUsers: boolean;         // O'quvchi ma'lumotini tahrirlash
}

export const ROLE_PERMISSIONS: Record<Role, Permissions> = {
  admin: {
    canManageStaff: true,
    canManageClasses: true,
    canAssignTeacher: true,
    canViewAllStudents: true,
    canViewOwnStudents: true,
    canBroadcast: true,
    canViewAllStaff: true,
    canEditUsers: true,
  },
  director: {
    canManageStaff: false,
    canManageClasses: false,
    canAssignTeacher: false,
    canViewAllStudents: true,
    canViewOwnStudents: true,
    canBroadcast: false,
    canViewAllStaff: true,
    canEditUsers: false,
  },
  zam_direktor: {
    canManageStaff: false,
    canManageClasses: false,
    canAssignTeacher: false,
    canViewAllStudents: true,
    canViewOwnStudents: true,
    canBroadcast: false,
    canViewAllStaff: true,
    canEditUsers: false,
  },
  zavuch: {
    canManageStaff: false,
    canManageClasses: false,
    canAssignTeacher: false,
    canViewAllStudents: true,
    canViewOwnStudents: true,
    canBroadcast: false,
    canViewAllStaff: true,
    canEditUsers: false,
  },
  teacher: {
    canManageStaff: false,
    canManageClasses: false,
    canAssignTeacher: false,
    canViewAllStudents: false,
    canViewOwnStudents: true,
    canBroadcast: false,
    canViewAllStaff: false,
    canEditUsers: false,
  },
  boshlangich_oqituvchi: {
    canManageStaff: false,
    canManageClasses: false,
    canAssignTeacher: false,
    canViewAllStudents: false,
    canViewOwnStudents: true,
    canBroadcast: false,
    canViewAllStaff: false,
    canEditUsers: false,
  },
};

export function getPermissions(role: Role): Permissions {
  return ROLE_PERMISSIONS[role];
}

// Rol tugmalari (admin uchun xodim qo'shishda)
export const ROLE_BUTTONS: { label: string; value: Role }[] = [
  { label: "🏛️ Direktor", value: "director" },
  { label: "📋 MMTB", value: "zam_direktor" },
  { label: "📚 O'quv ishlari mudiri", value: "zavuch" },
  { label: "👨‍🏫 Fan o'qituvchisi", value: "teacher" },
  { label: "🎒 Boshlang'ich sinf o'qituvchisi", value: "boshlangich_oqituvchi" },
];
