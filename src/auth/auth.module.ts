import { forwardRef, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { PasswordHasher } from './hashing/password-hasher';
import { BcryptHasher } from './hashing/bcrypt-hasher';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET 환경 변수가 설정되지 않았습니다.');
        }

        const expiresIn = parseInt(
          configService.get<string>('JWT_EXPIRATION_TIME', '3600'),
          10,
        );

        return {
          secret: secret,
          signOptions: {
            expiresIn: expiresIn, // 변환된 숫자를 사용하도록 수정
          },
        };
      },
      global: true,
    }),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: AuthService,
      useClass: AuthService,
    },
    {
      provide: PasswordHasher,
      useClass: BcryptHasher,
    },
  ],
  exports: [AuthService, PasswordHasher],
})
export class AuthModule {}
