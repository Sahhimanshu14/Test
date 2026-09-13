import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    if (!accessSecret && process.env.NODE_ENV !== 'test') {
      throw new Error('FATAL SECURITY ERROR: JWT_ACCESS_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        accessSecret || 'cdsprep_test_jwt_access_secret_32_characters_long',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User account not found or suspended');
    }

    const roles = user.roles.map((r) => r.role.name);
    const permissions = Array.from(
      new Set(
        user.roles.flatMap((r) =>
          r.role.permissions.map((rp) => rp.permission.action),
        ),
      ),
    );

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      targetAcademy: user.targetAcademy,
      roles,
      permissions,
    };
  }
}
