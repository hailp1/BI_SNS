export interface JwtPayload {
  sub: string;
  username: string;
  fullName: string;
  role: string;
  channel: string;
  scopeLevel: string;
  scopeValue: string;
  iat?: number;
  exp?: number;
}

export interface TempTokenPayload {
  sub: string;
  username: string;
  emailPending?: boolean;
  is2FaPending?: boolean;
  networkName?: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  channel: string;
  scopeLevel: string;
  scopeValue: string;
}
