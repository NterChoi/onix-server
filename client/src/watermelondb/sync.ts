import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from './database';
import Toast from 'react-native-toast-message';

// 로컬 개발 환경용 URL (iOS: localhost, Android: 10.0.2.2)
const API_BASE_URL = 'http://localhost:3000';

// 재시도 로직을 포함한 fetch 헬퍼 함수
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, backoff = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                // 5xx 서버 에러나 네트워크 문제일 때만 재시도
                if (response.status >= 500) throw new Error(`Server Error: ${response.status}`);
                return response; // 4xx 에러는 재시도 없이 반환
            }
            return response;
        } catch (err) {
            if (i === retries - 1) throw err; // 마지막 시도도 실패하면 에러 던짐
            console.warn(`재시도 중... (${i + 1}/${retries})`);
            await new Promise(res => setTimeout(res, backoff * Math.pow(2, i))); // 지수 백오프
        }
    }
    throw new Error('네트워크 요청에 실패했습니다.');
}

export async function syncData(token: string) {
    console.log('Syncing data...');
    try {
        await synchronize({
            database,
            pullChanges: async ({ lastPulledAt }) => {
                console.log('Pulling changes since:', lastPulledAt);
                const response = await fetchWithRetry(`${API_BASE_URL}/memos/pull`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        lastPulledAt: lastPulledAt ? new Date(lastPulledAt).toISOString() : null,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(`Pull failed: ${response.status} ${errorData}`);
                }

                const { changes, latestPulledAt } = await response.json();

                return {
                    changes: {
                        memos: {
                            created: [], // Server uses 'updated' for both creations and updates
                            updated: changes.updated,
                            deleted: changes.deleted,
                        },
                    },
                    timestamp: new Date(latestPulledAt).getTime(),
                };
            },
            pushChanges: async ({ changes }) => {
                const { created, updated, deleted } = changes.memos;

                // Flatten changes for Onix's Push API
                const pushedMemos = [
                    ...created.map((m: any) => ({
                        id: m.id,
                        title: m.title,
                        content: m.content,
                        version: m.version,
                        createdAt: new Date(m.created_at),
                        updatedAt: new Date(m.updated_at),
                        deletedAt: null
                    })),
                    ...updated.map((m: any) => ({
                        id: m.id,
                        title: m.title,
                        content: m.content,
                        version: m.version,
                        createdAt: new Date(m.created_at),
                        updatedAt: new Date(m.updated_at),
                        deletedAt: null
                    })),
                    ...deleted.map((id: string) => ({
                        id,
                        title: '', // Dummy for delete
                        content: '', // Not needed for delete but DTO might require it
                        version: 0, // Dummy
                        createdAt: new Date(), // Dummy
                        updatedAt: new Date(),
                        deletedAt: new Date()
                    })),
                ];

                if (pushedMemos.length === 0) return;

                console.log('Pushing changes:', pushedMemos.length, 'items');
                const response = await fetchWithRetry(`${API_BASE_URL}/memos/push`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ pushedMemos }),
                });

                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(`Push failed: ${response.status} ${errorData}`);
                }
            },
            migrationsEnabledAtVersion: 1,
        });
        console.log('Sync completed successfully');
        Toast.show({
            type: 'success',
            text1: '동기화 완료',
            text2: '모든 데이터가 최신 상태입니다.',
        });
    } catch (error: any) {
        console.error('Sync failed:', error);
        Toast.show({
            type: 'error',
            text1: '동기화 실패',
            text2: error.message || '네트워크 연결을 확인해주세요.',
        });
        throw error;
    }
}
