import React, {useState} from "react";
import {database} from "../watermelondb/database";
import Memo from "../watermelondb/model/Memo";
import {Button, StyleSheet, TextInput, View} from "react-native";

const MemoInput = () => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const handleAddMemo = async () => {
        if (!title.trim()) return;

        // WatermelonDB의 action을 사용하여 데이터를 저장합니다.
        await database.write(async () => {
            await database.get<Memo>('memos').create((memo) => {
                memo.title = title;
                memo.content = content;
                memo.version = 1;
                memo.userId = 'temp-user-id';
            });
        });

        setTitle('');
        setContent('');
    };

    return (
        <View style={styles.container}>
            <TextInput placeholder="제목" value={title} onChangeText={setTitle} style={styles.input}></TextInput>
            <TextInput placeholder="내용" value={content} onChangeText={setContent} style={styles.input}></TextInput>
            <Button title="메모 추가" onPress={handleAddMemo}></Button>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {padding: 16, borderBottomWidth: 1, borderBottomColor: '#ccc'},
    input: {borderWidth: 1, borderColor: '#ddd', padding: 8, marginBottom: 8, borderRadius: 4},
});

export default MemoInput;