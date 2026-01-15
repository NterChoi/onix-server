import { StatusBar } from 'expo-status-bar';
import {SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {useEffect, useState} from "react";
import {database} from "./src/watermelondb/database";
import Memo from "./src/watermelondb/model/Memo";
import MemoInput from "./src/components/MemoInput";
import MemoList from "./src/components/MemoList";

export default function App() {
  const [dbStatus, setDbStatus] = useState('Checking DB...');



    // 메모 삭제 핸들러 (Soft Delete)
    const handleDeleteMemo = async (memo: Memo) => {
      await database.write(async () => {
        await memo.markAsDeleted(); // 실제로 삭제하지 않고 deleted_at 플래그만 설정
      });
    };


  return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Onix Memo</Text>
        </View>

        <MemoInput/>

        <View style={styles.listContainer}>
          <MemoList onDelete={handleDeleteMemo}></MemoList>
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
  listContainer: {
    flex: 1,
  }
});
