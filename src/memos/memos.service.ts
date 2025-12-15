import { Injectable } from '@nestjs/common';
import {InjectRepository} from "@nestjs/typeorm";
import {Memo} from "./memo.entity";
import {Repository} from "typeorm";
import {CreateMemoDto} from "./dto/create-memo.dto";

@Injectable()
export class MemosService {
    constructor(
        @InjectRepository(Memo)
        private readonly memoRepository: Repository<Memo>
    ) {}

    async create(createMemoDTO: CreateMemoDto): Promise<Memo> {
        const memo = this.memoRepository.create(createMemoDTO);

        return await this.memoRepository.save(memo);
    }
}
