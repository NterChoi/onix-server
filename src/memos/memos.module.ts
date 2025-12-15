import { Module } from '@nestjs/common';
import {TypeOrmModule} from "@nestjs/typeorm";
import {Memo} from "./memo.entity";
import { MemosService } from './memos.service';
import { MemosController } from './memos.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Memo])],
    controllers: [MemosController],
    providers: [MemosService]
})
export class MemosModule {}
