import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {UsersModule} from "../users/users.module";
import {JwtModule} from "@nestjs/jwt";
import {jwtConstants} from "./constants";
import {APP_GUARD} from "@nestjs/core";
import {AuthGuard} from "./auth.guard";
import {PasswordHasher} from "./hashing/password-hasher";
import {BcryptHasher} from "./hashing/bcrypt-hasher";

@Module({
  imports: [
      UsersModule,
      JwtModule.register({
        global: true,
        secret: jwtConstants.secret,
        signOptions: {expiresIn: '60m'}
      })
  ],
  controllers: [AuthController],
  providers: [
      AuthService,
      {
          provide: APP_GUARD,
          useClass: AuthGuard,
      },
      {
          provide: PasswordHasher,
          useClass: BcryptHasher,
      }

  ],
  exports: [AuthService]
})
export class AuthModule {}
