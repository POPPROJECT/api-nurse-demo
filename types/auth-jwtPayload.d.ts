export interface AuthJwtPayload {
  sub: string; // ✅ ถูกต้อง
  name: string;
  role: Role;
}
