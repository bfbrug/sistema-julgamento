import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { env } from '../../../config/env';
import { JwtPayload } from '../types/jwt-payload.type';
import { FastifyRequest } from 'fastify';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: env.JWT_REFRESH_SECRET,
      passReqToCallback: true,
    });
  }

  async validate(req: FastifyRequest, payload: JwtPayload) {
    return payload;
  }
}
