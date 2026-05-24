export type StaffUpdateRole = typeof StaffUpdateRole[keyof typeof StaffUpdateRole];

export const StaffUpdateRole = {
  director: 'director',
  zam_direktor: 'zam_direktor',
  zavuch: 'zavuch',
  teacher: 'teacher',
  sinf_rahbari: 'sinf_rahbari',
  kutubxonachi: 'kutubxonachi',
} as const;
