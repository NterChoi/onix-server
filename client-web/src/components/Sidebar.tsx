import React from 'react';
import Memo from '../watermelondb/model/Memo';

interface SidebarProps {
  memos: Memo[];
  selectedMemoId?: string;
  onSelectMemo: (memo: Memo) => void;
  onAddMemo: () => void;
  onDeleteMemo: (memo: Memo) => void;
  isAuthenticated: boolean;
  onSync: () => void;
  onLoginClick: () => void;
  onLogout: () => void;
  isSyncing: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  memos,
  selectedMemoId,
  onSelectMemo,
  onAddMemo,
  onDeleteMemo,
  isAuthenticated,
  onSync,
  onLoginClick,
  onLogout,
  isSyncing,
}) => {
  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <h2 style={styles.title}>Onix Notes</h2>
        <button onClick={onAddMemo} style={styles.addButton}>+ New</button>
      </div>
      <div style={styles.list}>
        {memos.map((memo) => (
          <div
            key={memo.id}
            onClick={() => onSelectMemo(memo)}
            style={{
              ...styles.listItem,
              backgroundColor: selectedMemoId === memo.id ? '#3d3d3d' : 'transparent',
            }}
          >
            <div style={styles.memoTitle}>{memo.title || 'Untitled'}</div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteMemo(memo);
              }}
              style={styles.deleteButton}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      
      {/* 하단 동기화/인증 섹션 */}
      <div style={styles.footer}>
        {isAuthenticated ? (
          <div style={styles.authInfo}>
            <button 
              onClick={onSync} 
              disabled={isSyncing} 
              style={{...styles.syncButton, opacity: isSyncing ? 0.6 : 1}}
            >
              {isSyncing ? 'Syncing...' : '🔄 Sync Now'}
            </button>
            <button onClick={onLogout} style={styles.logoutButton}>Logout</button>
          </div>
        ) : (
          <button onClick={onLoginClick} style={styles.loginButton}>
            ☁️ Login to Sync
          </button>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  sidebar: {
    width: '260px',
    height: '100vh',
    backgroundColor: '#1e1e1e',
    borderRight: '1px solid #333',
    display: 'flex',
    flexDirection: 'column',
    color: '#ccc',
  },
  header: {
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #333',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#007aff',
    border: 'none',
    color: '#fff',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
  },
  listItem: {
    padding: '15px 20px',
    cursor: 'pointer',
    borderBottom: '1px solid #2a2a2a',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'background-color 0.2s',
  },
  memoTitle: {
    fontSize: '14px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginRight: '10px',
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '0 5px',
  },
  footer: {
    padding: '20px',
    borderTop: '1px solid #333',
    backgroundColor: '#1a1a1a',
  },
  authInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  syncButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  loginButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#444',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  logoutButton: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '12px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
};
