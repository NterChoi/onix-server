import { useState, useEffect, useRef } from 'react';
import { database } from '../watermelondb/database';
import Memo from '../watermelondb/model/Memo';
import { Q } from '@nozbe/watermelondb';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getToken } from '../utils/auth';

const API_BASE_URL = 'http://localhost:3000';

export const useMemos = () => {
    const [memos, setMemos] = useState<Memo[]>([]);
    const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
    const [loading, setLoading] = useState(true);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const memosQuery = database.get<Memo>('memos').query(Q.sortBy('updated_at', Q.desc));
        const subscription = memosQuery.observe().subscribe((newMemos) => {
            setMemos(newMemos);
            setLoading(false);
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!loading && memos.length > 0 && !selectedMemo) {
            setSelectedMemo(memos[0]);
        }
    }, [loading, memos, selectedMemo]);

    const addMemo = async () => {
        try {
            await database.write(async () => {
                const newMemo = await database.get<Memo>('memos').create((m) => {
                    m._raw.id = crypto.randomUUID();
                    m.title = 'New Note';
                    m.content = '';
                    m.version = 0;
                    m.userId = 'local_user';
                });
                setSelectedMemo(newMemo);
                toast.success('새 메모 생성');
            });
        } catch (err) {
            console.error('Create Error:', err);
            toast.error('메모 생성 실패');
        }
    };

    const deleteMemo = async (memoToDelete: Memo) => {
        if (!confirm('정말 이 메모를 삭제하시겠습니까?')) return;
        try {
            await database.write(async () => {
                await memoToDelete.update(m => { m.version += 1; });
                await memoToDelete.markAsDeleted();
            });
            if (selectedMemo?.id === memoToDelete.id) {
                setSelectedMemo(memos.find(m => m.id !== memoToDelete.id) || null);
            }
            toast.success('메모 삭제 완료');
        } catch (err) {
            console.error('Delete Error:', err);
            toast.error('메모 삭제 실패');
        }
    };

    const saveMemo = async (newContent: string) => {
        if (!selectedMemo) return;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await database.write(async () => {
                    // @ts-ignore
                    const isFirstEdit = selectedMemo._raw._status === 'synced';
                    await selectedMemo.update((m) => {
                        m.content = newContent;
                        const lines = newContent.split('\n');
                        const firstLine = lines[0].replace(/^#\s+/, '').substring(0, 50);
                        m.title = firstLine || 'Untitled';
                        if (isFirstEdit) m.version += 1;
                    });
                });
            } catch (err) {
                console.error('Save Error:', err);
                toast.error('저장 실패');
            }
        }, 500);
    };

    // 6. 충돌 메모 복구 (서버가 거절한 내 데이터를 다시 가져오고 싶을 때)
    const restoreMemo = async (memoId: string) => {
        const token = getToken();
        if (!token) return;
        try {
            const response = await axios.get(`${API_BASE_URL}/memos/${memoId}/histories`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const histories = response.data;
            if (histories.length === 0) {
                toast.error('복구할 히스토리가 없습니다.');
                return;
            }
            const latestHistory = histories[0];
            await database.write(async () => {
                const memo = await database.get<Memo>('memos').find(memoId);
                await memo.update((m) => {
                    m.title = latestHistory.title;
                    m.content = latestHistory.content;
                    m.version = latestHistory.version;
                    // @ts-ignore
                    m.lastSyncedVersion = latestHistory.serverVersion; 
                    // @ts-ignore
                    m._raw._status = 'synced';
                    // @ts-ignore
                    m._raw._changed = '';
                });
                setSelectedMemo(memo);
                toast.success('서버 아카이브에서 데이터를 복구했습니다.');
            });
        } catch (err) {
            console.error('Restore Error:', err);
            toast.error('복구 중 오류가 발생했습니다.');
        }
    };

    // 7. 충돌 해결 (내 수정을 버리고 서버의 현재 진실 - 예: 웹 수정본 - 을 가져올 때)
    const resolveConflictWithServer = async (memoId: string) => {
        const token = getToken();
        if (!token) return;
        try {
            const response = await axios.get(`${API_BASE_URL}/memos/${memoId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const serverMemo = response.data;
            await database.write(async () => {
                const memo = await database.get<Memo>('memos').find(memoId);
                await memo.update((m) => {
                    m.title = serverMemo.title;
                    m.content = serverMemo.content;
                    m.version = serverMemo.version;
                    // @ts-ignore
                    m.lastSyncedVersion = serverMemo.version;
                    // @ts-ignore
                    m._raw._status = 'synced';
                    // @ts-ignore
                    m._raw._changed = '';
                });
                setSelectedMemo(memo);
                toast.success('서버 데이터(최신 진실)로 업데이트되었습니다.');
            });
        } catch (err) {
            console.error('Resolve Conflict Error:', err);
            toast.error('서버 데이터를 가져오는 중 오류가 발생했습니다.');
        }
    };

    return {
        memos, selectedMemo, setSelectedMemo, loading,
        addMemo, deleteMemo, saveMemo, restoreMemo, resolveConflictWithServer
    };
};