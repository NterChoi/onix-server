import {MemosService} from "./memos.service";
import {DataSource, getRepository, MoreThan, Repository} from "typeorm";
import {before} from "node:test";
import {Test, TestingModule} from "@nestjs/testing";
import {getRepositoryToken} from "@nestjs/typeorm";
import {Memo} from "./entities/memo.entity";
import {MemosModule} from "./memos.module";
import {PushMemoDto} from "./dto/push-memo.dto";
import {last} from "rxjs";

type MockRepository<T extends object> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const mockMemoRepository = {
    find: jest.fn(),
}
const mockDataSource = {
    transaction: jest.fn(),
};

describe('MemoService', () => {
    let service: MemosService;
    let dataSource: DataSource;
    let memoRepository: MockRepository<Memo>;

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
                }
            ],
        }).compile();

        service = module.get<MemosService>(MemosService);
        dataSource = module.get<DataSource>(DataSource);
        memoRepository = module.get<MockRepository<Memo>>(getRepositoryToken(Memo));
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
                content: '새로운 메모 내용',
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            };
            const pushMemoDto: PushMemoDto = {pushedMemos: [clientMemo]};

            // 트랜잭션 내에서 사용될 가짜 EntityManager를 설정
            const mockEntityManager = {
                findOne: jest.fn().mockResolvedValue(null),
                update: jest.fn(),
                create: jest.fn().mockReturnValue(clientMemo),
                save: jest.fn()
            };

            // dataSource.transaction이 호출되면, 위에서 만든 가짜 EntityManager를 콜백 함수에 전달
            mockDataSource.transaction.mockImplementation(async (callback) => callback(mockEntityManager));

            // 2. When (테스트할 함수 실행)
            const result = await service.pushMemos(userId, pushMemoDto);

            // 3. Then (결과 검증)
            expect(result.results[0]).toEqual({ id: clientMemo.id, status: 'CREATED'});
            expect(mockEntityManager.findOne).toHaveBeenCalledTimes(1);
            expect(mockEntityManager.create).toHaveBeenCalledTimes(1);
            expect(mockEntityManager.save).toHaveBeenCalledTimes(1);
            expect(mockEntityManager.update).not.toHaveBeenCalled();
        });

        // TODO: 시나리오 2: 서버보다 최신 메모를 push 했을 때 (UPDATE)
        it('서버보다 최신 버전의 메모는 "UPDATED" 상태로 처리되어야 한다', async () => {
            // 1. Given (준비)
            const userId = 'test-user-id';
            const serverTime = new Date('2025-01-01T10:00:00Z');
            const clientTime = new Date('2025-01-01T11:00:00Z');

            const clientMemo = {
                id: 'existing-memo-id',
                content: '수정된 메모 내용',
                createdAt: serverTime,
                updatedAt: clientTime,
                deletedAt: null,
            };

            const serverMemo = {
                id: 'existing-memo-id',
                content: '원본 내용 메모',
                createdAt: serverTime,
                updatedAt: serverTime,
                deletedAt: null,
            };

            const pushMemoDto: PushMemoDto = {pushedMemos: [clientMemo]};

            // EntityManager 설정 : findOne이 'serverMemo'를 반환하도록 설정
            const mockEntityManager = {
                findOne: jest.fn().mockResolvedValue(serverMemo),
                update: jest.fn(),
                create: jest.fn(),
                save: jest.fn(),
            };
            mockDataSource.transaction.mockImplementation(async (callback) => callback(mockEntityManager));

            // 2. When (실행)
            const result = await service.pushMemos(userId, pushMemoDto);

            // 3. Then (검증)
            expect(result.results[0]).toEqual({ id : clientMemo.id, status: 'UPDATED'});
            expect(mockEntityManager.findOne).toHaveBeenCalledTimes(1);
            expect(mockEntityManager.update).toHaveBeenCalledTimes(1);

            // update가 올바른 인자들로 호출되었는지 상세 검증
            expect(mockEntityManager.update).toHaveBeenCalledWith(Memo, serverMemo.id, {
                content: clientMemo.content,
                updatedAt: clientMemo.updatedAt,
                deletedAt: clientMemo.deletedAt,
            });

            expect(mockEntityManager.create).not.toHaveBeenCalled();
            expect(mockEntityManager.save).not.toHaveBeenCalled();

        });
        // TODO: 시나리오 3: 서버와 같거나 오래된 메모를 push 했을 때 (IGNORE)
        it('서버보다 오래되거나 같은 버전의 메모는 "IGNORED" 상태로 처리되어야 한다.', async () => {
            // 1. Given (준비)
            const userId = 'test-user-id';
            const clientTime = new Date('2025-01-01T10:00:00Z');
            const serverTime = new Date('2025-01-01T11:00:00Z');

            const clientMemo = {
                id: 'existing-memo-id',
                content: '오래된 클라이언트 메모 내용',
                createdAt: clientTime,
                updatedAt: clientTime,
                deletedAt: null,
            };
            const serverMemo = {
                id: 'existing-memo-id',
                content: '최신 서버 메모 내용',
                createdAt: clientTime,
                updatedAt: serverTime,
                deletedAt: null,
            };
            const pushMemoDto: PushMemoDto = {pushedMemos: [clientMemo]};

            // EntityManager 설정 : findOnedl 'serverMemo'를 반환하도록 설정
            const mockEntityManager = {
                findOne: jest.fn().mockResolvedValue(serverMemo),
                update: jest.fn(),
                create: jest.fn(),
                save: jest.fn(),
            };
            mockDataSource.transaction.mockImplementation(async (callback) => callback(mockEntityManager));

            // 2. When (실행)
            const result = await service.pushMemos(userId, pushMemoDto);

            // 3. Then (검증)
            expect(result.results[0]).toEqual({ id: clientMemo.id, status: "IGNORED"});
            expect(mockEntityManager.findOne).toHaveBeenCalledTimes(1);

            // 가장 중요한 검증 : DB를 변경하는 어떤 함수도 호출되지 않았어야 함
            expect(mockEntityManager.update).not.toHaveBeenCalled();
            expect(mockEntityManager.create).not.toHaveBeenCalled();
            expect(mockEntityManager.save).not.toHaveBeenCalled();
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