import { useState } from 'react';
import { syncOnix } from '../watermelondb/sync';
import { database } from '../watermelondb/database';
import Memo from '../watermelondb/model/Memo';
import { Q } from '@nozbe/watermelondb';
import toast from 'react-hot-toast';

export const useSync = () => {
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        const syncToast = toast.loading('서버와 동기화 중...');
        try {
            await syncOnix();
            toast.success('동기화 완료!', { id: syncToast });
        } catch (err: any) {
            console.error('Sync Error:', err);
            
            if (err.message === 'CONFLICT_DETECTED') {
                const conflictIds = err.conflictIds || [];
                toast.error(`${conflictIds.length}건의 충돌 발생. 복구 모드 진입...`, { id: syncToast });
                
                try {
                    await database.write(async () => {
                        const updates: any[] = [];
                        for (const id of conflictIds) {
                            try {
                                const memo = await database.get<Memo>('memos').find(id);
                                updates.push(
                                    memo.prepareUpdate(m => {
                                        // @ts-ignore
                                        m._raw._status = 'synced';
                                        // @ts-ignore
                                        m._raw._changed = '';
                                    })
                                );
                            } catch (e) {
                                const raws = await database.get('memos').query(Q.where('id', id)).unsafeFetchRaw();
                                if (raws.length > 0) {
                                    // @ts-ignore
                                    await database.adapter.batch([
                                        ['update', 'memos', { ...raws[0], _status: 'synced', _changed: '', deleted_at: null }]
                                    ]);
                                }
                            }
                        }
                        if (updates.length > 0) {
                            await database.batch(...updates);
                        }
                    });

                    await syncOnix();
                    toast.success('데이터 복구 완료!');
                    setTimeout(() => window.location.reload(), 1500); 
                } catch (retryErr) {
                    console.error('Recovery Sync Error:', retryErr);
                    toast.error('복구 중 오류가 발생했습니다.');
                }
            } else {
                toast.error(`동기화 실패: ${err.message}`, { id: syncToast });
            }
        } finally {
            setIsSyncing(false);
        }
    };

    return {
        isSyncing,
        handleSync
    };
};
