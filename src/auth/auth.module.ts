import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {UsersModule} from "../users/users.module";
import {JwtModule} from "@nestjs/jwt";

@Module({
  imports: [
      UsersModule,
      JwtModule.register({
        global: true,
        secret: 'TEMP_SECRET_KEY_CHANGE_THIS',
        signOptions: {expiresIn: '60m'}
      })
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService]
})
export class AuthModule {}
