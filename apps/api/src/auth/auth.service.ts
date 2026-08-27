import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { apiError } from '../common/errors';
import type { AuthUser, GlobalRole } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';

export interface AuthResult {
  accessToken: string;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !bcrypt.compareSync(dto.password, user.passwordHash)) {
      return apiError(HttpStatus.UNAUTHORIZED, 'AUTH_REQUIRED', '邮箱或密码错误');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      globalRole: user.globalRole as GlobalRole,
    };
    const accessToken = await this.jwt.signAsync(authUser);
    return { accessToken, user: authUser };
  }

  me(user: AuthUser): AuthUser {
    return user;
  }

  /** 供种子/调试使用：签发 token 的过期时间配置 */
  expiresIn(): string {
    return this.config.get<string>('JWT_EXPIRES_IN', '15m');
  }
}
