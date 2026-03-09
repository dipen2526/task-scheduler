import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from 'src/modules/auth/dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Authenticate user credentials and generate a JWT access token.
   */
  login(dto: LoginDto) {
    const expectedUsername = process.env.AUTH_USERNAME ?? 'admin';
    const expectedPassword = process.env.AUTH_PASSWORD ?? 'admin123';

    if (dto.username !== expectedUsername || dto.password !== expectedPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    try {
      return {
        accessToken: this.jwtService.sign({
          sub: dto.username,
          role: 'admin',
        }),
      };
    } catch (error) {
      this.logger.error(
        'Failed to generate JWT access token',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Failed to generate access token');
    }
  }
}
