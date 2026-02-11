import { useState } from 'react'
import { Editor } from "./components/Editor.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { AuthScreen } from "./components/AuthScreen.tsx";
import { syncOnix } from './watermelondb/sync';
import { getToken, removeToken } from './utils/auth';
import { useMemos } from './hooks/useMemos';
import toast, { Toaster } from 'react-hot-toast';

function App() {
    const { 
        memos, 
        selectedMemo, 
        setSelectedMemo, 
        loading, 
        addMemo, 
        deleteMemo, 
        saveMemo, 
        restoreMemo,
        resolveConflictWithServer
    } = useMemos();

    const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [hasConflict, setHasConflict] = useState(false);

    // 1. 동기화 실행
    const handleSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        setHasConflict(false);
        try {
            await syncOnix();
            toast.success('동기화 완료!');
        } catch (err: any) {
            console.error('Sync Error:', err);
            if (err.message === 'CONFLICT_DETECTED') {
                setHasConflict(true);
                toast.error('동기화 중 충돌이 발생했습니다. 서버 아카이브를 확인하세요.', { duration: 5000 });
            } else {
                toast.error(`동기화 실패: ${err.message}`);
            }
        } finally {
            setIsSyncing(false);
        }
    };

    // 2. 인증 관련
    const handleAuthenticated = () => {
        setIsAuthenticated(true);
        setShowAuthModal(false);
        handleSync();
    };

    const handleLogout = () => {
        if (confirm('로그아웃 하시겠습니까?')) {
            removeToken();
            setIsAuthenticated(false);
        }
    };

    if (loading) return <div style={{color: 'white', padding: 20, backgroundColor: '#1a1a1a', height: '100vh'}}>Loading Onix...</div>;

    return (
        <div style={{display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#282c34', position: 'relative'}}>
            <Toaster position="top-right" />
            
            <Sidebar 
                memos={memos} 
                selectedMemoId={selectedMemo?.id}
                onSelectMemo={setSelectedMemo}
                onAddMemo={addMemo}
                onDeleteMemo={deleteMemo}
                isAuthenticated={isAuthenticated}
                onSync={handleSync}
                onLoginClick={() => setShowAuthModal(true)}
                onLogout={handleLogout}
                isSyncing={isSyncing}
            />
            <div style={{flex: 1, height: '100%', display: 'flex', flexDirection: 'column'}}>
                {/* 충돌 알림 배너 */}
                {hasConflict && selectedMemo && (
                    <div style={styles.conflictBanner}>
                        <span>⚠️ 충돌 감지! 서버 데이터(웹 수정본)를 가져오시겠습니까, 아니면 버려진 내 데이터(일렉트론 수정본)를 복구하시겠습니까?</span>
                        <div style={{display: 'flex', gap: '10px'}}>
                            <button 
                                onClick={() => {
                                    resolveConflictWithServer(selectedMemo.id);
                                    setHasConflict(false);
                                }}
                                style={{...styles.restoreButton, backgroundColor: '#28a745'}}
                            >
                                Take Server Version
                            </button>
                            <button 
                                onClick={() => {
                                    restoreMemo(selectedMemo.id);
                                    setHasConflict(false);
                                }}
                                style={styles.restoreButton}
                            >
                                Restore My Changes
                            </button>
                        </div>
                    </div>
                )}

                {selectedMemo ? (
                    <div style={{flex: 1}}>
                        <Editor 
                            key={selectedMemo.id} 
                            value={selectedMemo.content || ''} 
                            onChange={saveMemo} 
                        />
                    </div>
                ) : (
                    <div style={styles.emptyState}>
                        <p>작성된 메모가 없습니다. 새 메모를 추가해보세요!</p>
                        <button onClick={addMemo} style={styles.emptyButton}>+ Create New Note</button>
                    </div>
                )}
            </div>

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
    conflictBanner: {
        backgroundColor: '#fff3cd',
        color: '#856404',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #ffeeba',
        fontSize: '14px',
        fontWeight: '500'
    },
    restoreButton: {
        backgroundColor: '#856404',
        color: 'white',
        border: 'none',
        padding: '6px 12px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px'
    },
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
