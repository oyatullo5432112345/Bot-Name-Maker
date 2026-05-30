export interface HealthStatus {
  status: string;
}

export interface ErrorResponse {
  error: string;
}

export interface SuccessResponse {
  ok: boolean;
}

export interface LoginInput {
  login: string;
  password: string;
}

export interface RegisterInput {
  full_name: string;
  phone_number: string;
  class_name: string;
  login: string;
  password: string;
}

export type AuthResultRole = typeof AuthResultRole[keyof typeof AuthResultRole];

export const AuthResultRole = {
  admin: 'admin',
  director: 'director',
  zam_direktor: 'zam_direktor',
  zavuch: 'zavuch',
  teacher: 'teacher',
  sinf_rahbari: 'sinf_rahbari',
  kutubxonachi: 'kutubxonachi',
  student: 'student',
} as const;

export interface AuthResult {
  id: string;
  role: AuthResultRole;
  full_name: string;
  login: string;
  /** @nullable */
  class_name?: string | null;
  /** @nullable */
  class_id?: string | null;
  /** @nullable */
  telegram_id?: number | null;
  /** @nullable */
  token?: string | null;
}

export interface Student {
  telegram_id: number;
  full_name: string;
  phone_number: string;
  class_name: string;
  login: string;
  password: string;
  registration_date: string;
}

export interface StudentInput {
  full_name: string;
  phone_number: string;
  class_name: string;
}

export interface StudentUpdate {
  full_name?: string;
  phone_number?: string;
  class_name?: string;
  password?: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  /** @nullable */
  teacher_id?: string | null;
  /** @nullable */
  teacher_name?: string | null;
  student_count?: number;
  created_at: string;
}

export interface ClassInput {
  name: string;
}

export interface AssignTeacherInput {
  staff_id: string;
}

export type StaffMemberRole = typeof StaffMemberRole[keyof typeof StaffMemberRole];

export const StaffMemberRole = {
  director: 'director',
  zam_direktor: 'zam_direktor',
  zavuch: 'zavuch',
  teacher: 'teacher',
  sinf_rahbari: 'sinf_rahbari',
  kutubxonachi: 'kutubxonachi',
} as const;

export interface StaffMember {
  id: string;
  full_name: string;
  role: StaffMemberRole;
  /** @nullable */
  class_id?: string | null;
  /** @nullable */
  class_name?: string | null;
  login: string;
  password: string;
  /** @nullable */
  telegram_id?: number | null;
  created_at: string;
}

export type StaffInputRole = typeof StaffInputRole[keyof typeof StaffInputRole];

export const StaffInputRole = {
  director: 'director',
  zam_direktor: 'zam_direktor',
  zavuch: 'zavuch',
  teacher: 'teacher',
  sinf_rahbari: 'sinf_rahbari',
  kutubxonachi: 'kutubxonachi',
} as const;

export interface StaffInput {
  full_name: string;
  role: StaffInputRole;
  /** @nullable */
  class_id?: string | null;
}

export type StaffUpdateRole = typeof StaffUpdateRole[keyof typeof StaffUpdateRole];

export const StaffUpdateRole = {
  director: 'director',
  zam_direktor: 'zam_direktor',
  zavuch: 'zavuch',
  teacher: 'teacher',
  sinf_rahbari: 'sinf_rahbari',
  kutubxonachi: 'kutubxonachi',
} as const;

export interface StaffUpdate {
  full_name?: string;
  login?: string;
  role?: StaffUpdateRole;
  /** @nullable */
  class_id?: string | null;
  password?: string;
}

export interface ClassCount {
  class_name: string;
  count: number;
}

export interface DashboardStats {
  total_students: number;
  total_classes: number;
  total_staff: number;
  days_until_launch: number;
  students_by_class: ClassCount[];
}

export interface MyClassResult {
  class_name: string;
  /** @nullable */
  class_id?: string | null;
  students: Student[];
}

export type ListStudentsParams = {
class_name?: string;
};

export interface TeacherSubject {
  id: string;
  teacher_id: string;
  class_id: string;
  subject: string;
  teacher_name?: string | null;
  teacher_role?: string | null;
  created_at: string;
}
