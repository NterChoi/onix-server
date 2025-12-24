// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MemosModule } from './memos/memos.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // 1. .env 파일을 읽어오는 설정 (전역 사용)
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 2. DB 연결 설정 (비동기 방식: forRootAsync)
    // 왜 Async인가? 환경변수(ConfigService)를 다 읽은 후에 DB에 붙어야 하니까요.
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'mysql',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '3306'),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,

        // 엔티티(테이블 정의)를 자동으로 불러옵니다.
        autoLoadEntities: true,

        // 개발 환경에서만 true! (서버 켤 때마다 DB 스키마를 코드에 맞게 뜯어고침)
        synchronize: true,
        timezone: 'Z'
      }),
    }),

    MemosModule,

    UsersModule,

    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}