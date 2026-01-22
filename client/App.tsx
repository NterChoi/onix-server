import { StatusBar } from 'expo-status-bar';
import {Alert, SafeAreaView, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator} from 'react-native';
import {useEffect, useState} from "react";
import {database} from "./src/watermelondb/database";
import Memo from "./src/watermelondb/model/Memo";
import MemoInput from "./src/components/MemoInput";
import MemoList from "./src/components/MemoList";
import AuthScreen from "./src/components/AuthScreen";
import {syncData} from "./src/watermelondb/sync";
import {getToken, removeToken, saveToken} from "./src/utils/auth";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);

  useEffect(() => {
      const loadToken = async () => {
          try {
              const storedToken = await getToken();
              if (storedToken) {
                  setToken(storedToken);
              }
          } catch (e) {
              console.error("Failed to load token", e);
          } finally {
              setIsLoadingToken(false);
          }
      };
      loadToken();
  }, []);

    // 메모 삭제 핸들러 (Soft Delete)
    const handleDeleteMemo = async (memo: Memo) => {
      await database.write(async () => {
        await memo.markAsDeleted(); // 실제로 삭제하지 않고 deleted_at 플래그만 설정
      });
    };

    // 메모 수정 핸들러
    const handleUpdateMemo = async (id: string, title: string, content: string) => {
        await database.write(async () => {
            const memo = await database.get<Memo>('memos').find(id);
            await memo.update(m => {
                m.title = title;
                m.content = content;
                m.version += 1; // 버전 증가
            });
        });
        setEditingMemo(null); // 수정 모드 종료
    };

    const handleSync = async () => {
        if (!token) return;

        setIsSyncing(true);
        try {
            await syncData(token);
            Alert.alert('성공', '동기화가 완료되었습니다!');
        } catch (error: any) {
            Alert.alert('동기화 실패', error.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleAuthenticated = async (newToken: string) => {
        await saveToken(newToken);
        setToken(newToken);
    };

    const handleLogout = async () => {
        await removeToken();
        setToken(null);
        // Local-first 특성상 로컬 데이터는 유지하지만, 
        // 다중 사용자 환경을 고려한다면 여기서 DB 초기화 로직을 고민해볼 수 있습니다.
    };

    if (isLoadingToken) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" />
            </View>
        );
    }


  if (!token) {
      return (
          <>
            <AuthScreen onAuthenticated={handleAuthenticated} />
            <StatusBar style="auto"/>
          </>
      );
  }

  return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Onix Memo</Text>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.syncContainer}>
             <TouchableOpacity 
                style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]} 
                onPress={handleSync}
                disabled={isSyncing}
            >
                <Text style={styles.syncButtonText}>{isSyncing ? "동기화 중..." : "동기화 실행"}</Text>
            </TouchableOpacity>
        </View>

        <MemoInput
            memoToEdit={editingMemo}
            onCancelEdit={() => setEditingMemo(null)}
            onUpdateMemo={handleUpdateMemo}
        />

        <View style={styles.listContainer}>
          <MemoList
              onDelete={handleDeleteMemo}
              onEdit={setEditingMemo}
          />
        </View>

        <StatusBar style="auto"/>

      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 29,
    fontWeight: 'bold'
  },
  logoutButton: {
      padding: 8,
  },
  logoutText: {
      color: 'red',
      fontSize: 16,
  },
  syncContainer: {
    padding: 10,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  syncButton: {
      backgroundColor: '#34C759',
      paddingVertical: 8,
      paddingHorizontal: 20,
      borderRadius: 20,
  },
  syncButtonDisabled: {
      backgroundColor: '#98dbaa',
  },
  syncButtonText: {
      color: '#fff',
      fontWeight: '600'
  },
  listContainer: {
    flex: 1,
  }
});
