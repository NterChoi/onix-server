import { useState, useEffect } from 'react'
import { Editor } from "./components/Editor.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { AuthScreen } from "./components/AuthScreen.tsx";
import { database } from './watermelondb/database';
import Memo from './watermelondb/model/Memo';
import { Q } from '@nozbe/watermelondb';
import { syncOnix } from './watermelondb/sync';
import { getToken, removeToken } from './utils/auth';

function App() {
    const [memos, setMemos] = useState<Memo[]>([]);
    const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

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

    useEffect(() => {
        if (!loading && memos.length > 0 && !selectedMemo) {
            setSelectedMemo(memos[0]);
        }
    }, [loading, memos]);

    // 2. 동기화 실행
    const handleSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        try {
            await syncOnix();
            alert('동기화 성공!');
        } catch (err: any) {
            console.error('Sync Error:', err);
            
            if (err.message === 'CONFLICT_DETECTED') {
                const conflictIds = err.conflictIds || [];
                alert(`${conflictIds.length}건의 메모에 충돌이 발생했습니다. 서버의 최신 데이터로 강제 업데이트합니다.`);
                
                try {
                    // [강제 복구 로직 강화]
                    await database.write(async () => {
                        const updates: any[] = [];
                        for (const id of conflictIds) {
                            try {
                                const memo = await database.get<Memo>('memos').find(id);
                                updates.push(
                                    memo.prepareUpdate(m => {
                                        // @ts-ignore
                                        m._raw._status = 'synced'; // 로컬 수정 마킹 제거
                                        // @ts-ignore
                                        m._raw._changed = ''; // 변경 필드 초기화
                                    })
                                );
                            } catch (e) {
                                // 삭제된 메모 처리
                                const raws = await database.get('memos').query(Q.where('id', id)).unsafeFetchRaw();
                                if (raws.length > 0) {
                                    // @ts-ignore
                                    await database.adapter.batch([
                                        ['update', { ...raws[0], _status: 'synced', _changed: '', deleted_at: null }]
                                    ]);
                                }
                            }
                        }
                        if (updates.length > 0) {
                            await database.batch(...updates); // 준비된 업데이트를 한 번에 실행
                        }
                    });

                    console.log('Recovery: Local status reset. Re-syncing...');
                    // 다시 동기화 실행 (이제 로컬이 'synced' 상태이므로 서버 데이터를 정상적으로 받아옴)
                    await syncOnix();
                    alert('데이터 복구 완료!');
                    window.location.reload(); 
                } catch (retryErr) {
                    console.error('Recovery Sync Error:', retryErr);
                }
            } else {
                alert(`동기화 실패: ${err.message}`);
            }
        } finally {
            setIsSyncing(false);
        }
    };

    // 3. 인증 관련
    const handleAuthenticated = () => {
        setIsAuthenticated(true);
        setShowAuthModal(false);
        handleSync(); // 로그인 성공 시 자동 동기화
    };

    const handleLogout = () => {
        if (confirm('로그아웃 하시겠습니까?')) {
            removeToken();
            setIsAuthenticated(false);
        }
    };

    // 4. 새 메모 추가 / 삭제 / 저장 로직 (기존과 동일)
    const handleAddMemo = async () => {
        try {
            await database.write(async () => {
                const newMemo = await database.get<Memo>('memos').create((m) => {
                    m._raw.id = crypto.randomUUID(); // 명시적으로 UUID 생성
                    m.title = 'New Note';
                    m.content = '';
                    m.version = 1;
                    m.lastSyncedVersion = 0; // 신규 메모는 서버 버전 0에서 시작
                    m.userId = 'local_user';
                });
                setSelectedMemo(newMemo);
            });
        } catch (err) {
            console.error('Create Error:', err);
        }
    };

    const handleDeleteMemo = async (memoToDelete: Memo) => {
        if (!confirm('정말 이 메모를 삭제하시겠습니까?')) return;
        try {
            await database.write(async () => {
                // 삭제하기 전에 버전을 1 증가시켜서 서버가 '새로운 변경사항'으로 인식하게 함
                await memoToDelete.update(m => {
                    m.version += 1;
                });
                await memoToDelete.markAsDeleted();
            });
            if (selectedMemo?.id === memoToDelete.id) {
                setSelectedMemo(memos.find(m => m.id !== memoToDelete.id) || null);
            }
        } catch (err) {
            console.error('Delete Error:', err);
        }
    };

    const handleSave = async (newContent: string) => {
        if (!selectedMemo) return;
        try {
            await database.write(async () => {
                await selectedMemo.update((m) => {
                    m.content = newContent;
                    const lines = newContent.split('\n');
                    const firstLine = lines[0].replace(/^#\s+/, '').substring(0, 50);
                    m.title = firstLine || 'Untitled';
                    m.version += 1; // 버전 증가
                });
            });
        } catch (err) {
            console.error('Save Error:', err);
        }
    };

    if (loading) return <div style={{color: 'white', padding: 20, backgroundColor: '#1a1a1a', height: '100vh'}}>Loading Onix...</div>;

    return (
        <div style={{display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#282c34', position: 'relative'}}>
            <Sidebar 
                memos={memos} 
                selectedMemoId={selectedMemo?.id}
                onSelectMemo={setSelectedMemo}
                onAddMemo={handleAddMemo}
                onDeleteMemo={handleDeleteMemo}
                isAuthenticated={isAuthenticated}
                onSync={handleSync}
                onLoginClick={() => setShowAuthModal(true)}
                onLogout={handleLogout}
                isSyncing={isSyncing}
            />
            <div style={{flex: 1, height: '100%'}}>
                {selectedMemo ? (
                    <Editor key={selectedMemo.id} value={selectedMemo.content || ''} onChange={handleSave}></Editor>
                ) : (
                    <div style={styles.emptyState}>
                        <p>작성된 메모가 없습니다. 새 메모를 추가해보세요!</p>
                        <button onClick={handleAddMemo} style={styles.emptyButton}>+ Create New Note</button>
                    </div>
                )}
            </div>

            {/* 인증 모달 (간단하게 구현) */}
            {showAuthModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <button onClick={() => setShowAuthModal(false)} style={styles.closeButton}>×</button>
                        <AuthScreen onAuthenticated={handleAuthenticated} />
                    </div>
                </div>
            )}
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        color: '#666',
        backgroundColor: '#282c34'
    },
    emptyButton: {
        marginTop: '20px',
        padding: '10px 20px',
        backgroundColor: '#007aff',
        border: 'none',
        borderRadius: '6px',
        color: 'white',
        cursor: 'pointer',
        fontSize: '16px'
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    },
    modalContent: {
        position: 'relative',
        width: '100%',
        maxWidth: '450px'
    },
    closeButton: {
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'none',
        border: 'none',
        color: 'white',
        fontSize: '30px',
        cursor: 'pointer',
        zIndex: 1001
    }
}

export default App
