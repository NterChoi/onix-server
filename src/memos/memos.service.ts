import {Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from "@nestjs/typeorm";
import {Memo} from "./memo.entity";
import {Repository} from "typeorm";
import {CreateMemoDto} from "./dto/create-memo.dto";
import {UpdateMemoDto} from "./dto/update-memo.dto";


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

    async findAll(): Promise<Memo[]> {
        return await this.memoRepository.find({order: {createdAt: 'DESC'}});
    }

    async findOne(id: string): Promise<Memo> {
        const memo = await this.memoRepository.findOne({where: {id}})

        if (!memo) {
            throw new NotFoundException(`Memo with ID ${id} not found`);
        }

        return memo;

    }

    async update(id: string, updateMemoDTO: UpdateMemoDto): Promise<Memo> {

        const memo = await this.findOne(id);

        Object.assign(memo, updateMemoDTO);

        return await this.memoRepository.save(memo);
    }

    async softDelete(id: string) {
        await this.findOne(id)

        await this.memoRepository.softDelete(id);

        const deletedMemo =  await this.memoRepository.findOne({
            where: {id},
            withDeleted: true,
        });

        if (!deletedMemo) {
            throw new NotFoundException(`Failed to retrieve soft-deleted memo with ID ${id}`);
        }

        return deletedMemo;

    }


}
