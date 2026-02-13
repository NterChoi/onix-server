import {MemosService} from "./memos.service";
import {DataSource, getRepository, MoreThan, Repository} from "typeorm";
import {before} from "node:test";
import {Test, TestingModule} from "@nestjs/testing";
import {getRepositoryToken} from "@nestjs/typeorm";
import {Memo} from "./entities/memo.entity";
import {MemoHistory} from "./entities/memo-history.entity";
import {MemosModule} from "./memos.module";
import {PushMemoDto} from "./dto/push-memo.dto";
import {last} from "rxjs";

type MockRepository<T extends object> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const mockMemoRepository = {
    find: jest.fn(),
};
const mockMemoHistoryRepository = {
    create: jest.fn(),
    save: jest.fn(),
};
const mockDataSource = {
    transaction: jest.fn(),
};

describe('MemoService', () => {
    let service: MemosService;
    let dataSource: DataSource;
    let memoRepository: MockRepository<Memo>;
    let memoHistoryRepository: MockRepository<MemoHistory>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MemosService,
                {
                    provide: DataSource,
                    useValue: mockDataSource,
                },
                {
                    provide: getRepositoryToken(Memo),
                    useValue: mockMemoRepository,
                },
                {
                    provide: getRepositoryToken(MemoHistory),
                    useValue: mockMemoHistoryRepository,
                }
            ],
        }).compile();

        service = module.get<MemosService>(MemosService);
        dataSource = module.get<DataSource>(DataSource);
        memoRepository = module.get<MockRepository<Memo>>(getRepositoryToken(Memo));
        memoHistoryRepository = module.get<MockRepository<MemoHistory>>(getRepositoryToken(MemoHistory));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should  be defined', () => {
        expect(service).toBeDefined();
    });

    describe('pushMemos', () => {
        it('새로운 메모는 "CREATED" 상태로 처리되어야 한다', async () => {
            // 1. Given ( 테스트 준비 )
            const userId = 'test-user-id';
            const clientMemo = {
                id: 'client-memo-id-1',
                title: '새 메모',
                content: '새로운 메모 내용',
                version: 1,
                baseVersion: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            };
            const pushMemoDto: PushMemoDto = {pushedMemos: [clientMemo as any]};

            // 트랜잭션 내에서 사용될 가짜 EntityManager를 설정
            const mockEntityManager = {
                find: jest.fn().mockResolvedValue([]), // 기존 메모가 없음을 가정
                create: jest.fn().mockImplementation((entity, data) => data),
                save: jest.fn()
            };

            // dataSource.transaction이 호출되면, 위에서 만든 가짜 EntityManager를 콜백 함수에 전달
            mockDataSource.transaction.mockImplementation(async (callback) => callback(mockEntityManager));

            // 2. When (테스트할 함수 실행)
            const result = await service.pushMemos(userId, pushMemoDto);

            // 3. Then (결과 검증)
            expect(result.results[0]).toEqual({ id: clientMemo.id, status: 'CREATED'});
            expect(mockEntityManager.find).toHaveBeenCalledTimes(1);
            expect(mockEntityManager.create).toHaveBeenCalledTimes(1);
            expect(mockEntityManager.save).toHaveBeenCalledWith(Memo, expect.any(Array));
        });

        it('서버보다 최신 버전의 메모(baseVersion 일치)는 "UPDATED" 상태로 처리되어야 한다', async () => {
            // 1. Given (준비)
            const userId = 'test-user-id';
            const clientMemo = {
                id: 'existing-memo-id',
                title: '수정된 제목',
                content: '수정된 메모 내용',
                version: 2,
                baseVersion: 1, // 서버의 현재 버전과 일치
                updatedAt: new Date(),
                deletedAt: null,
            };

            const serverMemo = {
                id: 'existing-memo-id',
                title: '원본 제목',
                content: '원본 내용',
                version: 1,
                updatedAt: new Date('2025-01-01'),
                deletedAt: null,
            };

            const pushMemoDto: PushMemoDto = {pushedMemos: [clientMemo as any]};

            const mockEntityManager = {
                find: jest.fn().mockResolvedValue([serverMemo]),
                save: jest.fn(),
            };
            mockDataSource.transaction.mockImplementation(async (callback) => callback(mockEntityManager));

            // 2. When
            const result = await service.pushMemos(userId, pushMemoDto);

            // 3. Then
            expect(result.results[0]).toEqual({ id: clientMemo.id, status: 'UPDATED'});
            expect(mockEntityManager.save).toHaveBeenCalledWith(Memo, expect.arrayContaining([
                expect.objectContaining({
                    id: clientMemo.id,
                    version: 2,
                    title: '수정된 제목'
                })
            ]));
        });

        it('baseVersion이 일치하지 않으면 "CONFLICT" 상태로 처리되고 히스토리에 저장되어야 한다', async () => {
            // 1. Given (준비)
            const userId = 'test-user-id';
            const clientMemo = {
                id: 'conflict-memo-id',
                title: '내 수정본',
                content: '충돌하는 내용',
                version: 5,
                baseVersion: 3, // 서버는 이미 4버전인데 클라이언트는 3에서 수정을 시작함
                updatedAt: new Date(),
                deletedAt: null,
            };

            const serverMemo = {
                id: 'conflict-memo-id',
                title: '서버의 최신본',
                content: '누군가 먼저 수정한 내용',
                version: 4,
                updatedAt: new Date(),
                deletedAt: null,
            };

            const pushMemoDto: PushMemoDto = {pushedMemos: [clientMemo as any]};

            const mockEntityManager = {
                find: jest.fn().mockResolvedValue([serverMemo]),
                create: jest.fn().mockImplementation((entity, data) => data),
                save: jest.fn(),
            };
            mockDataSource.transaction.mockImplementation(async (callback) => callback(mockEntityManager));

            // 2. When
            const result = await service.pushMemos(userId, pushMemoDto);

            // 3. Then
            expect(result.results[0]).toEqual({ id: clientMemo.id, status: 'CONFLICT'});
            
            // MemoHistory가 저장되는지 확인
            expect(mockEntityManager.create).toHaveBeenCalledWith(MemoHistory, expect.objectContaining({
                memoId: clientMemo.id,
                serverVersion: 4,
                baseVersion: 3
            }));
            expect(mockEntityManager.save).toHaveBeenCalledWith(MemoHistory, expect.any(Array));
            
            // 원본 Memo 테이블은 업데이트되지 않아야 함
            expect(mockEntityManager.save).not.toHaveBeenCalledWith(Memo, expect.any(Array));
        });
    })

    describe('pull', () => {
        it('lastPulledAt 이후에 변경된 메모와 삭제된 메모 ID들을 반환해야 한다', async () => {
            // 1. Given (준비)
            const userId = 'test-user-id';
            const lastPulledAt = new Date('2025-01-10T00:00:00Z');

            const updatedMemos = [
                {id: 'memo-1', content: 'updated content', updatedAt: new Date()},
            ];
            const deletedMemos = [{id: 'memo-2'}];

            // memoRepository.find가 처음 호출될 때 (updated 찾기) -> updatedMemos 반환
            mockMemoRepository.find.mockReturnValueOnce(Promise.resolve(updatedMemos));
            // memoRepository.find가 두 번째 호출될 때 (deleted 찾기) -> deletedMemos 반환
            mockMemoRepository.find.mockReturnValue(Promise.resolve(deletedMemos));

            // 2. When (실행)
            const result = await service.pull(userId, lastPulledAt);

            // 3. Then (검증)
            // 반환된 데이터 검증
            expect(result.changes.updated).toEqual(updatedMemos);
            expect(result.changes.deleted).toEqual(['memo-2']);
            expect(result.latestPulledAt).toBeInstanceOf(Date);

            // memoRepository.find가 어떻게 호출되었는지 검증
            expect(mockMemoRepository.find).toHaveBeenCalledTimes(2);

            // 첫 번째 호출(updated) 검증
            expect(mockMemoRepository.find).toHaveBeenCalledWith({
                where: {
                    userId,
                    updatedAt: MoreThan(lastPulledAt),
                }
            });

            // 두 번째 호출(deleted) 검증
            expect(mockMemoRepository.find).toHaveBeenCalledWith({
                where: {
                    userId,
                    deletedAt: MoreThan(lastPulledAt),
                },
                withDeleted: true,
                select: ['id'],
            });
        });
    })
})