export type UserRole = 'player' | 'admin';

export interface User {
  id: string;
  displayName: string;
  login: string;
  role: UserRole;
}
