// import {
//   CanActivate,
//   ExecutionContext,
//   Injectable,
//   ForbiddenException,
// } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { ROLES_KEY } from '../decorators/roles.decorator'; // ✅ ใช้ร่วมกับ @Roles()
// import { Role } from '../enums/role.enum'; // ✅ enum แบบ type-safe

// @Injectable()
// export class RolesGuard implements CanActivate {
//   constructor(private reflector: Reflector) {}

//   canActivate(context: ExecutionContext): boolean {
//     const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
//       context.getHandler(),
//       context.getClass(),
//     ]);

//     // ✅ ถ้าไม่มี @Roles → ปล่อยผ่าน
//     if (!requiredRoles || requiredRoles.length === 0) return true;

//     const { user } = context.switchToHttp().getRequest();

//     // ✅ ป้องกันกรณี JWT ไม่มี user (เช่น JWT expired)
//     if (!user || !user.role) {
//       throw new ForbiddenException('Missing authentication data');
//     }

//     if (!requiredRoles.includes(user.role)) {
//       console.log(
//         '❌ Role mismatch. Got:',
//         user.role,
//         'Expected:',
//         requiredRoles,
//       );
//       throw new ForbiddenException('You do not have permission');
//     }

//     // return true;
//     return requiredRoles.includes(user.role as Role);
//   }
// }

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger, // Recommended for debugging
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'; // <-- IMPORT THIS

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name); // Optional: for logging

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const controllerName = context.getClass().name;
    const methodName = context.getHandler().name;
    // this.logger.log(`RolesGuard: Checking access for ${controllerName}.${methodName}`); // Optional logging

    // --- Step 1: Check if the route is marked as Public ---
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // this.logger.log(`RolesGuard: Route ${controllerName}.${methodName} is public. Access granted.`); // Optional logging
      return true; // If @Public() is present, allow immediately
    }

    // --- Step 2: If not public, proceed with role checking ---
    // this.logger.log(`RolesGuard: Route ${controllerName}.${methodName} is not public. Checking roles.`); // Optional logging
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      // this.logger.log(`RolesGuard: No specific roles required by @Roles for ${controllerName}.${methodName}. Access granted.`); // Optional logging
      return true; // No roles defined for this route, so allow (assuming JwtOrSessionGuard already ran)
    }
    // this.logger.log(`RolesGuard: Required roles for ${controllerName}.${methodName}: ${requiredRoles.join(', ')}`); // Optional logging

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      // Ensure user object and role property exist
      // this.logger.warn(`RolesGuard: User or user.role is missing for ${controllerName}.${methodName}. Denying access.`); // Optional logging
      // Throw a more specific error or the original one if you prefer
      throw new ForbiddenException(
        'Authentication data is missing or incomplete for role checking.',
      );
    }
    // this.logger.log(`RolesGuard: User's role for ${controllerName}.${methodName}: ${user.role}`); // Optional logging

    // Check if the user's role is one of the required roles
    if (!requiredRoles.includes(user.role as Role)) {
      this.logger.warn(
        `RolesGuard: Role mismatch for ${controllerName}.${methodName}. User role: "${user.role}", Expected one of: "${requiredRoles.join(', ')}"`,
      );
      throw new ForbiddenException(
        'You do not have permission to access this resource.',
      );
    }

    // this.logger.log(`RolesGuard: User has required role for ${controllerName}.${methodName}. Access granted.`); // Optional logging
    return true; // User has one of the required roles
  }
}
