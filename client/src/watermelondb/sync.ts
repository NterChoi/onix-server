import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from './database';

// 로컬 개발 환경용 URL (iOS: localhost, Android: 10.0.2.2)
const API_BASE_URL = 'http://localhost:3000';

export async function syncData(token: string) {
    console.log('Syncing data...');
    try {
        await synchronize({
            database,
            pullChanges: async ({ lastPulledAt }) => {
                console.log('Pulling changes since:', lastPulledAt);
                const response = await fetch(`${API_BASE_URL}/memos/pull`, {
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
                const response = await fetch(`${API_BASE_URL}/memos/push`, {
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
    } catch (error) {
        console.error('Sync failed:', error);
        throw error;
    }
}
