import {ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from "@nestjs/typeorm";
import {Memo} from "./entities/memo.entity";
import {DataSource, MoreThan, In,Repository} from "typeorm";
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

        if (pushedMemos.length === 0) {
            return {results: []};
        }

        // 성능 최적화 : 대량 데이터 처리 시 페이로드 크기 제한
        if (pushedMemos.length > 500) {
            throw new Error('Too many memos in a single push. please sync in smaller batches.');
        }

        const pushedIds = pushedMemos.map(m => m.id);

        await this.dataSource.transaction(async (transactionalEntityManager) => {
            // 1. 기존 메모들을 한 번에 조회 (N+1 문제 해결)
            const existingMemos = await transactionalEntityManager.find(Memo, {
                where: {
                    id: In(pushedIds),
                    userId: userId,
                },
                withDeleted: true,
            });

            const existingMemosMap = new Map(existingMemos.map(m => [m.id, m]));
            const toSave: Memo[] = [];

            for (const clientMemo of pushedMemos) {
                const serverMemo = existingMemosMap.get(clientMemo.id);

                if (serverMemo) {
                    // 버전 기반 충돌 감지
                    const isClientVersionNewer = clientMemo.version > serverMemo.version;
                    const isDeletionRequest = !!clientMemo.deletedAt;
                    
                    // 삭제 요청이거나 클라이언트 버전이 더 높을 때만 업데이트 수용
                    if (isDeletionRequest || isClientVersionNewer) {
                        if (clientMemo.deletedAt) {
                            // 삭제 시 버전은 유지하거나 필요시 1 증가
                            serverMemo.version = clientMemo.version > 0 ? clientMemo.version : serverMemo.version + 1;
                            serverMemo.updatedAt = clientMemo.updatedAt;
                            serverMemo.deletedAt = clientMemo.deletedAt;
                            results.push({id: clientMemo.id, status: 'DELETED'});
                        } else {
                            serverMemo.title = clientMemo.title;
                            serverMemo.content = clientMemo.content;
                            serverMemo.version = clientMemo.version;
                            serverMemo.updatedAt = clientMemo.updatedAt;
                            serverMemo.deletedAt = null;
                            results.push({id: clientMemo.id, status: 'UPDATED'});
                        }
                        toSave.push(serverMemo);
                    } else {
                        // 업데이트 요청인데 버전이 낮거나 같으면 충돌!
                        console.warn(`[Sync Conflict] Memo ${clientMemo.id} rejected. Client version: ${clientMemo.version}, Server version: ${serverMemo.version}`);
                        results.push({id: clientMemo.id, status: 'CONFLICT'});
                    }
                } else {
                    // 서버에 메모가 없을 경우 (CREATE)
                    const newMemo = transactionalEntityManager.create(Memo, {
                        ...clientMemo,
                        user: {id: userId},
                    });
                    toSave.push(newMemo);
                    results.push({id: clientMemo.id, status: 'CREATED'});
                }
            }

            // 2. 변경사항 일괄 저장
            if (toSave.length > 0) {
                await transactionalEntityManager.save(Memo, toSave);
            }
        });

        console.log(`[Sync] Pushed ${pushedMemos.length} memos for user ${userId}. (saved: ${results.filter(r => r.status !== 'IGNORED').length}`);
        return {results}
    }
}
