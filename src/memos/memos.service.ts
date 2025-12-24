import {ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from "@nestjs/typeorm";
import {Memo} from "./entities/memo.entity";
import {MoreThan, MoreThanOrEqual, Repository} from "typeorm";
import {CreateMemoDto} from "./dto/create-memo.dto";
import {UpdateMemoDto} from "./dto/update-memo.dto";


@Injectable()
export class MemosService {
    constructor(
        @InjectRepository(Memo)
        private readonly memoRepository: Repository<Memo>
    ) {}

    async create(createMemoDTO: CreateMemoDto, userId: string): Promise<Memo> {
        const memo = this.memoRepository.create({...createMemoDTO, userId: userId});

        return await this.memoRepository.save(memo);
    }

    async findAll(userId: string): Promise<Memo[]> {
        return await this.memoRepository.find({
            where: {userId: userId},
            order: {createdAt: 'DESC'}
        });
    }

    async findOne(id: string, userId: string): Promise<Memo> {
        const memo = await this.memoRepository.findOne({where: {id}})

        if (!memo) {
            throw new NotFoundException(`Memo with ID ${id} not found`);
        }

        if (memo.userId !== userId) {
            throw new ForbiddenException('이 메모에 접근할 권한이 없습니다.');
        }

        return memo;

    }

    async update(id: string, updateMemoDTO: UpdateMemoDto, userId: string): Promise<Memo> {

        const memo = await this.findOne(id, userId);

        Object.assign(memo, updateMemoDTO);

        return await this.memoRepository.save(memo);
    }

    async softDelete(id: string, userId: string) {
        await this.findOne(id, userId)

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


    async pull(userId: string, lastPulledAt: Date | null) {
        const serverTime = new Date();
        const safeLastPulledAt = lastPulledAt || new Date(0);

        const updated = await this.memoRepository.find({
            where: {
                userId,
                updatedAt: MoreThan(safeLastPulledAt),
            },
        });

        const deletedResult = await this.memoRepository.find({
            where: {
                userId,
                deletedAt: MoreThan(safeLastPulledAt),
            },
            withDeleted: true,
            select: ['id']
        });

        const deleteIds = deletedResult.map(memo => memo.id);

        return {
            changes: {
                updated: updated,
                deleted: deleteIds
            },
            latestPulledAt: serverTime,
        };
    }
}
