import { Outlet } from './outlet';
import { Position } from './position';
import { LiveLogin } from './live-login';

export interface UserActivity {
  userId: string;
  lastSeenAt: string;
  isOnline: boolean;
}

export interface ResourceAccess {
  list: boolean;
  get: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  restore: boolean;
  deletePermanently: boolean;
}

export interface UserAccess {
  dashboard: ResourceAccess;
  user: ResourceAccess;
  kpi: ResourceAccess;
  outlet: ResourceAccess;
  kpi_hrd: ResourceAccess;
  kpi_finance: ResourceAccess;
  kpi_pr: ResourceAccess;
  kpi_operations: ResourceAccess;
  kpi_incident: ResourceAccess;
}

export interface UserSessionData {
  _id: string;
  name: string;
  image?: string;
  outlet?: string;
  position?: string;
  outletDoc?: Outlet;
  positionDoc?: Position;
  username: string;
  email: string;
  role: string;
  roleApproval?: string;
  access?: UserAccess;
  lastLoginAt: string;
  lastSeenAt?: string;
  activity?: UserActivity;
  liveLogin?: LiveLogin;
  onlineDuration?: number;
  todayOnlineDuration?: number;
  accessToken: string;
  refreshToken: string;
  tokenExpiresIn: number;
  accessTokenExpiresAt: Date | null;
  lastLogins?: any[];
  outletAccessMode?: string;
  outletAccess?: string[];
  phone: string;
  createdAt: string;
  updatedAt: string;
}
