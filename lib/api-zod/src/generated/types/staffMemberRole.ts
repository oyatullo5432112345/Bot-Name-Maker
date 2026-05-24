export type StaffMemberRole = typeof StaffMemberRole[keyof typeof StaffMemberRole];

export const StaffMemberRole = {
  director: 'director',
  zam_direktor: 'zam_direktor',
  zavuch: 'zavuch',
  teacher: 'teacher',
  sinf_rahbari: 'sinf_rahbari',
  kutubxonachi: 'kutubxonachi',
} as const;
