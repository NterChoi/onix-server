import React, {useEffect, useState} from "react";
import {database} from "../watermelondb/database";
import Memo from "../watermelondb/model/Memo";
import {Button, StyleSheet, TextInput, View} from "react-native";
import * as Crypto from 'expo-crypto';

interface MemoInputProps {
    memoToEdit?: Memo | null;
    onCancelEdit?: () => void;
    onUpdateMemo?: (id: string, title: string, content: string) => void;
}

const MemoInput = ({ memoToEdit, onCancelEdit, onUpdateMemo }: MemoInputProps) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        if (memoToEdit) {
            setTitle(memoToEdit.title);
            setContent(memoToEdit.content || '');
        } else {
            setTitle('');
            setContent('');
        }
    }, [memoToEdit]);

    const handleSave = async () => {
        if (!title.trim()) return;

        if (memoToEdit && onUpdateMemo) {
            // 수정 모드
            onUpdateMemo(memoToEdit.id, title, content);
        } else {
            // 생성 모드
            await database.write(async () => {
                await database.get<Memo>('memos').create((memo) => {
                    memo._raw.id = Crypto.randomUUID();
                    memo.title = title;
                    memo.content = content;
                    memo.version = 1;
                    memo.userId = 'temp-user-id';
                });
            });
            setTitle('');
            setContent('');
        }
    };

    return (
        <View style={styles.container}>
            <TextInput placeholder="제목" value={title} onChangeText={setTitle} style={styles.input}></TextInput>
            <TextInput placeholder="내용" value={content} onChangeText={setContent} style={styles.input}></TextInput>
            <View style={styles.buttonContainer}>
                {memoToEdit && (
                    <View style={{marginRight: 8}}>
                        <Button title="취소" onPress={onCancelEdit} color="#666" />
                    </View>
                )}
                <Button title={memoToEdit ? "메모 수정" : "메모 추가"} onPress={handleSave}></Button>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {padding: 16, borderBottomWidth: 1, borderBottomColor: '#ccc'},
    input: {borderWidth: 1, borderColor: '#ddd', padding: 8, marginBottom: 8, borderRadius: 4},
    buttonContainer: { flexDirection: 'row', justifyContent: 'flex-end' }
});

export default MemoInput;