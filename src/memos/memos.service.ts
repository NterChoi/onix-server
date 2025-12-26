import {ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from "@nestjs/typeorm";
import {Memo} from "./entities/memo.entity";
import {DataSource, MoreThan, MoreThanOrEqual, Repository} from "typeorm";
import {CreateMemoDto} from "./dto/create-memo.dto";
import {UpdateMemoDto} from "./dto/update-memo.dto";
import {PushMemoDto} from "./dto/push-memo.dto";


@Injectable()
export class MemosService {
    constructor(
        @InjectRepository(Memo)
        private readonly memoRepository: Repository<Memo>,
        private readonly dataSource: DataSource,
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

    async pushMemos(
        userId: string,
        { pushedMemos } : PushMemoDto,
                    ) : Promise<{ results: Array<{ id: string; status: string }>}> {
        const results: Array<{ id: string, status: string; }> = [];

        await this.dataSource.transaction(async (transactionalEntityManager) => {
            for (const clientMemo of pushedMemos) {
                // 동시성 제어를 위해 비관적 잠금을 사용해 서버 메모 조회
                const serverMemo = await transactionalEntityManager.findOne(Memo, {
                    where: {id: clientMemo.id, user: {id: userId}},
                    lock: {mode: 'pessimistic_write'},
                });

                // Case 1: 서버에 이미 메모가 존재할 경우 (Update or Ignore)
                if (serverMemo) {
                    // 클라이언트 버전이 더 최신이면 업데이트
                    if (clientMemo.updatedAt > serverMemo.updatedAt) {
                        await transactionalEntityManager.update(Memo, serverMemo.id, {
                            content: clientMemo.content,
                            updatedAt: clientMemo.updatedAt,
                            deletedAt: clientMemo.deletedAt,
                        });
                        results.push({id: clientMemo.id, status: 'UPDATED'});
                    } else {
                        // 서버 버전이 더 최신이거나 같으면 무시
                        results.push({id: clientMemo.id, status: 'IGNORED'});
                    }
                } // Case 2: 서버에 메모가 없을 경우 (CREATE)
                else {
                    const newMemo = transactionalEntityManager.create(Memo, {
                        ...clientMemo,
                        user: {id: userId},
                    });
                    await transactionalEntityManager.save(Memo, newMemo);
                    results.push({id: clientMemo.id, status: 'CREATED'});
                }
            }
        });

        return {results};
    }
}
