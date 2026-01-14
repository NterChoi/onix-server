import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import {useEffect, useState} from "react";
import {database} from "./src/watermelondb/database";

export default function App() {
  const [dbStatus, setDbStatus] = useState('Checking DB...');

  useEffect(() => {
    const checkDB = async () => {
      try {
        const count = await database.get('memos').query().fetchCount();
        setDbStatus(`\`✅DB Connected! Memo Count: ${count}`);
      } catch (error) {
        setDbStatus('❌ DB Error: ${error}');
        console.error(error);
      }
    };
    checkDB();
  }, []);

  return (
      <View style={styles.container}>
        <Text>{dbStatus}</Text>
        <StatusBar style="auto"/>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
