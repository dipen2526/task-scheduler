import {
  Body,
  Controller,
  HttpException,
  InternalServerErrorException,
  Logger,
  Post,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { LoginDto } from 'src/modules/auth/dto/login.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Validate credentials and issue an access token.
   */
  @Post('login')
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    try {
      const auth = this.authService.login(dto);
      res.setHeader(
        'Set-Cookie',
        `access_token=${auth.accessToken}; Path=/; HttpOnly; SameSite=Lax`,
      );
      return auth;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        'Unexpected error in AuthController.login',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Unexpected server error');
    }
  }
}
