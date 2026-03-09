import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from 'src/modules/auth/auth.controller';
import { AuthService } from 'src/modules/auth/auth.service';
import { JwtAuthGuard } from './auth.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'scheduler-secret',
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? '12h') as any,
      },
    }),
  ],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
  controllers: [AuthController],
})
export class AuthModule {}
