import { SetMetadata } from '@nestjs/common';
import type { GlobalRole } from '../types';

export const ROLES_KEY = 'roles';
/** 限定全局角色（admin/teacher/audience） */
export const Roles = (...roles: GlobalRole[]) => SetMetadata(ROLES_KEY, roles);
