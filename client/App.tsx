import { StatusBar } from 'expo-status-bar';
import {Alert, Button, SafeAreaView, StyleSheet, Text, TextInput, View} from 'react-native';
import {useEffect, useState} from "react";
import {database} from "./src/watermelondb/database";
import Memo from "./src/watermelondb/model/Memo";
import MemoInput from "./src/components/MemoInput";
import MemoList from "./src/components/MemoList";
import {syncData} from "./src/watermelondb/sync";

export default function App() {
  const [token, setToken] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null);

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
        if (!token) {
            Alert.alert('Error', 'Please enter a JWT token');
            return;
        }

        setIsSyncing(true);
        try {
            await syncData(token);
            Alert.alert('Success', 'Sync completed!');
        } catch (error: any) {
            Alert.alert('Sync Failed', error.message);
        } finally {
            setIsSyncing(false);
        }
    };


  return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Onix Memo</Text>
        </View>

        <View style={styles.syncContainer}>
            <TextInput
                style={styles.tokenInput}
                placeholder="Paste JWT Token here"
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
                autoCorrect={false}
            />
            <Button
                title={isSyncing ? "Syncing..." : "Sync Now"}
                onPress={handleSync}
                disabled={isSyncing}
            />
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
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 29,
    fontWeight: 'bold'
  },
  syncContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
    gap: 10
  },
  tokenInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 12
  },
  listContainer: {
    flex: 1,
  }
});
