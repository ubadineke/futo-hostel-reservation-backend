export type Role = 'student' | 'admin';

/** Shape attached to `req.user` by the JWT strategy, decoded from the token payload. */
export interface AuthUser {
  id: string;
  role: Role;
}
