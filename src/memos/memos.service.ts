import {ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from "@nestjs/typeorm";
import {Memo} from "./entities/memo.entity";
import {DataSource, MoreThan, In,Repository} from "typeorm";
import {CreateMemoDto} from "./dto/create-memo.dto";
import {UpdateMemoDto} from "./dto/update-memo.dto";
import {PushMemoDto} from "./dto/push-memo.dto";
import {MemoHistory} from "./entities/memo-history.entity";


@Injectable()
export class MemosService {
    constructor(
        @InjectRepository(Memo)
        private readonly memoRepository: Repository<Memo>,
        @InjectRepository(MemoHistory)
        private readonly memoHistoryRepository: Repository<MemoHistory>,
        private readonly dataSource: DataSource,
    ) {}

    async findHistories(memoId: string, userId: string): Promise<MemoHistory[]> {
        return await this.memoHistoryRepository.find({
            where: { memoId, userId },
            order: { createdAt: 'DESC' },
        });
    }

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
            const historiesToSave: MemoHistory[] = [];

            for (const clientMemo of pushedMemos) {
                const serverMemo = existingMemosMap.get(clientMemo.id);

                if (serverMemo) {
                    // [고도화된 충돌 감지 로직]
                    const isBaseVersionMatch = clientMemo.baseVersion === serverMemo.version;
                    const isVersionHigher = clientMemo.version > serverMemo.version;
                    const isDeletionRequest = !!clientMemo.deletedAt;

                    console.log(`[Sync Debug] Memo ID: ${clientMemo.id}`);
                    console.log(` - Client: version=${clientMemo.version}, baseVersion=${clientMemo.baseVersion}`);
                    console.log(` - Server: version=${serverMemo.version}`);
                    console.log(` - Match: baseMatch=${isBaseVersionMatch}, higher=${isVersionHigher}`);

                    if (isBaseVersionMatch && isVersionHigher) {
                        if (clientMemo.deletedAt) {
                            serverMemo.version = clientMemo.version;
                            serverMemo.updatedAt = clientMemo.updatedAt;
                            serverMemo.deletedAt = clientMemo.deletedAt;
                            results.push({id: clientMemo.id, status: 'DELETED'});
                        } else {
                            serverMemo.title = clientMemo.title || '';
                            serverMemo.content = clientMemo.content;
                            serverMemo.version = clientMemo.version;
                            serverMemo.updatedAt = clientMemo.updatedAt;
                            serverMemo.deletedAt = null;
                            results.push({id: clientMemo.id, status: 'UPDATED'});
                        }
                        toSave.push(serverMemo);
                    } else if (isDeletionRequest && clientMemo.version > serverMemo.version) {
                        // 삭제의 경우 baseVersion이 다르더라도 클라이언트가 삭제를 원한다면 수용할 수도 있음 (정책 결정 사항)
                        serverMemo.version = clientMemo.version;
                        serverMemo.deletedAt = clientMemo.deletedAt;
                        toSave.push(serverMemo);
                        results.push({id: clientMemo.id, status: 'DELETED'});
                    } else {
                        // 기준 버전이 다르거나 클라이언트 버전이 낮으면 충돌! -> 히스토리에 기록
                        console.warn(`[Sync Conflict] Memo ${clientMemo.id} archived. Client baseVersion: ${clientMemo.baseVersion}, Server version: ${serverMemo.version}`);
                        
                        const history = transactionalEntityManager.create(MemoHistory, {
                            memoId: clientMemo.id,
                            userId: userId,
                            title: clientMemo.title || '',
                            content: clientMemo.content,
                            version: clientMemo.version,
                            baseVersion: clientMemo.baseVersion,
                            serverVersion: serverMemo.version,
                        });
                        historiesToSave.push(history);
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

            // 3. 충돌 히스토리 일괄 저장
            if (historiesToSave.length > 0) {
                await transactionalEntityManager.save(MemoHistory, historiesToSave);
            }
        });

        console.log(`[Sync] Pushed ${pushedMemos.length} memos for user ${userId}. (saved: ${results.filter(r => r.status !== 'IGNORED').length}`);
        return {results}
    }
}
