export type StaffInputRole = typeof StaffInputRole[keyof typeof StaffInputRole];

export const StaffInputRole = {
  director: 'director',
  zam_direktor: 'zam_direktor',
  zavuch: 'zavuch',
  teacher: 'teacher',
  sinf_rahbari: 'sinf_rahbari',
  kutubxonachi: 'kutubxonachi',
} as const;
