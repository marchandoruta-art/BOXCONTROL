export type UserRole = 'mecanico' | 'chapista' | 'oficina' | 'admin';

export type VehicleStatus =
  | 'recibido'
  | 'presupuestar'
  | 'presupuestado'
  | 'en_reparacion'
  | 'pendiente_piezas'
  | 'control_calidad'
  | 'terminado'
  | 'entregado';

export type VehiclePriority = 'baja' | 'normal' | 'alta' | 'urgente';

export const STATUS_LABELS: Record<VehicleStatus, string> = {
  recibido: 'Recibido',
  presupuestar: 'Presupuestar',
  presupuestado: 'Presupuestado',
  en_reparacion: 'En Reparación',
  pendiente_piezas: 'Pendiente Piezas',
  control_calidad: 'Control de Calidad',
  terminado: 'Terminado',
  entregado: 'Entregado',
};

export const STATUS_STYLES: Record<VehicleStatus, string> = {
  recibido: 'status-received',
  presupuestar: 'status-to-quote',
  presupuestado: 'status-quoted',
  en_reparacion: 'status-in-progress',
  pendiente_piezas: 'status-pending-parts',
  control_calidad: 'status-quality',
  terminado: 'status-completed',
  entregado: 'status-delivered',
};

export const STATUS_ORDER: VehicleStatus[] = [
  'recibido',
  'presupuestar',
  'presupuestado',
  'en_reparacion',
  'pendiente_piezas',
  'control_calidad',
  'terminado',
  'entregado',
];

export const PRIORITY_LABELS: Record<VehiclePriority, string> = {
  baja: 'Baja',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  mecanico: 'Mecánico',
  chapista: 'Chapista',
  oficina: 'Administración',
  admin: 'Administrador',
};

// Permisos por rol
export const ROLE_PERMISSIONS: Record<UserRole, {
  canDeleteVehicle: boolean;
  canDeleteOrg: boolean;
  canManageBilling: boolean;
  canInviteMembers: boolean;
  canChangeRoles: boolean;
  canRemoveMembers: boolean;
  canCreateVehicle: boolean;
  canEditVehicleStatus: boolean;
  canManageWorkOrders: boolean;
  canViewAnalytics: boolean;
}> = {
  admin: {
    canDeleteVehicle: true,
    canDeleteOrg: true,
    canManageBilling: true,
    canInviteMembers: true,
    canChangeRoles: true,
    canRemoveMembers: true,
    canCreateVehicle: true,
    canEditVehicleStatus: true,
    canManageWorkOrders: true,
    canViewAnalytics: true,
  },
  oficina: {
    canDeleteVehicle: false,
    canDeleteOrg: false,
    canManageBilling: false,
    canInviteMembers: false,
    canChangeRoles: false,
    canRemoveMembers: false,
    canCreateVehicle: true,
    canEditVehicleStatus: true,
    canManageWorkOrders: true,
    canViewAnalytics: true,
  },
  mecanico: {
    canDeleteVehicle: false,
    canDeleteOrg: false,
    canManageBilling: false,
    canInviteMembers: false,
    canChangeRoles: false,
    canRemoveMembers: false,
    canCreateVehicle: false,
    canEditVehicleStatus: true,
    canManageWorkOrders: false,
    canViewAnalytics: false,
  },
  chapista: {
    canDeleteVehicle: false,
    canDeleteOrg: false,
    canManageBilling: false,
    canInviteMembers: false,
    canChangeRoles: false,
    canRemoveMembers: false,
    canCreateVehicle: false,
    canEditVehicleStatus: true,
    canManageWorkOrders: false,
    canViewAnalytics: false,
  },
};

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  owner_id: string;
  plan: 'trial' | 'starter' | 'pro';
  subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled';
  trial_ends_at?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  created_at: string;
}

export interface Owner {
  id: string;
  organization_id: string;
  name: string;
  phone?: string;
  email?: string;
  dni?: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  organization_id: string;
  owner_id: string;
  plate: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  status: VehicleStatus;
  priority: VehiclePriority;
  client_description?: string;
  work_summary?: string;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
  owner?: Owner;
}

export interface QualityChecklistItem {
  item: string;
  passed: boolean;
  notes?: string;
}

export const DEFAULT_QUALITY_CHECKLIST: string[] = [
  'Frenos',
  'Dirección',
  'Suspensión',
  'Ruidos anómalos',
  'Testigos del cuadro',
  'Niveles (aceite, refrigerante, frenos)',
  'Luces y señalización',
  'Comportamiento en carretera',
];

export interface VehicleQualityCheck {
  id: string;
  vehicle_id: string;
  organization_id: string;
  checklist: QualityChecklistItem[];
  road_test_completed: boolean;
  road_test_notes?: string;
  road_test_km?: number;
  passed: boolean | null;
  checked_by?: string;
  checked_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TimeLog {
  id: string;
  organization_id: string;
  vehicle_id: string;
  user_id: string;
  started_at: string;
  ended_at?: string | null;
  total_minutes?: number | null;
  notes?: string;
}

export interface AttendanceLog {
  id: string;
  organization_id: string;
  user_id: string;
  clock_in: string;
  clock_out?: string | null;
  total_minutes?: number | null;
}

export interface Profile {
  id: string;
  organization_id: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
}

export interface VehiclePhoto {
  id: string;
  organization_id: string;
  vehicle_id: string;
  storage_path: string;
  caption?: string | null;
  uploaded_by?: string | null;
  created_at: string;
}

export interface TeamInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: UserRole;
  token: string;
  invited_by?: string | null;
  accepted_at?: string | null;
  expires_at: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
  role: UserRole;
}
