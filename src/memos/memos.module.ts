import { Module } from '@nestjs/common';
import {TypeOrmModule} from "@nestjs/typeorm";
import {Memo} from "./entities/memo.entity";
import { MemosService } from './memos.service';
import { MemosController } from './memos.controller';
import {UsersModule} from "../users/users.module";

@Module({
    imports: [
        TypeOrmModule.forFeature([Memo]),
        UsersModule
    ],
    controllers: [MemosController],
    providers: [MemosService]
})
export class MemosModule {}
