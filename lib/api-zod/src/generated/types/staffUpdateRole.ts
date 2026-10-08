export type StaffUpdateRole = typeof StaffUpdateRole[keyof typeof StaffUpdateRole];

export const StaffUpdateRole = {
  director: 'director',
  mudir: 'mudir',
  zam_direktor: 'zam_direktor',
  zavuch: 'zavuch',
  teacher: 'teacher',
  sinf_rahbari: 'sinf_rahbari',
  boshlangich_oqituvchi: 'boshlangich_oqituvchi',
  kutubxonachi: 'kutubxonachi',
} as const;
