import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

function getCookieValue(cookieHeader: string | undefined, key: string): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  for (const part of cookieHeader.split(';')) {
    const [rawKey, ...rawValueParts] = part.trim().split('=');
    if (rawKey !== key) {
      continue;
    }

    const rawValue = rawValueParts.join('=').trim();
    if (!rawValue) {
      return undefined;
    }

    return decodeURIComponent(rawValue);
  }

  return undefined;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Authorize request using `Authorization` bearer token or `access_token` cookie.
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    const cookieToken = getCookieValue(request.headers.cookie, 'access_token');
    const headerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : undefined;
    const token = headerToken ?? cookieToken;

    if (!token) {
      throw new UnauthorizedException('Missing bearer token or auth cookie');
    }

    try {
      const payload = this.jwtService.verify(token);
      request['user'] = payload;
      return true;
    } catch (error) {
      this.logger.warn(
        `Token verification failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new UnauthorizedException('Invalid token');
    }
  }
}
