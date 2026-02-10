import { useState, useEffect, useRef } from 'react';
import { database } from '../watermelondb/database';
import Memo from '../watermelondb/model/Memo';
import { Q } from '@nozbe/watermelondb';
import toast from 'react-hot-toast';

export const useMemos = () => {
    const [memos, setMemos] = useState<Memo[]>([]);
    const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
    const [loading, setLoading] = useState(true);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 1. 초기 로드 및 실시간 구독
    useEffect(() => {
        const memosQuery = database.get<Memo>('memos').query(
            Q.sortBy('updated_at', Q.desc)
        );
        
        const subscription = memosQuery.observe().subscribe((newMemos) => {
            setMemos(newMemos);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    // 2. 초기 선택 로직
    useEffect(() => {
        if (!loading && memos.length > 0 && !selectedMemo) {
            setSelectedMemo(memos[0]);
        }
    }, [loading, memos, selectedMemo]);

    // 3. 새 메모 추가
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

    // 4. 메모 삭제
    const deleteMemo = async (memoToDelete: Memo) => {
        if (!confirm('정말 이 메모를 삭제하시겠습니까?')) return;
        try {
            await database.write(async () => {
                await memoToDelete.update(m => {
                    m.version += 1;
                });
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

    // 5. 메모 저장 (디바운싱 포함)
    const saveMemo = async (newContent: string) => {
        if (!selectedMemo) return;
        
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

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
                        
                        if (isFirstEdit) {
                            m.version += 1;
                        }
                    });
                });
            } catch (err) {
                console.error('Save Error:', err);
                toast.error('저장 실패');
            }
        }, 500);
    };

    return {
        memos,
        selectedMemo,
        setSelectedMemo,
        loading,
        addMemo,
        deleteMemo,
        saveMemo
    };
};
