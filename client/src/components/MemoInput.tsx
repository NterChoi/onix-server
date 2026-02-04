import React, {useEffect, useState} from "react";
import {database} from "../watermelondb/database";
import Memo from "../watermelondb/model/Memo";
import {Button, StyleSheet, TextInput, View, Text, TouchableOpacity, ScrollView} from "react-native";
import Toast from 'react-native-toast-message';
import * as Crypto from 'expo-crypto';
import Markdown from 'react-native-markdown-display';

interface MemoInputProps {
    memoToEdit?: Memo | null;
    onCancelEdit?: () => void;
    onUpdateMemo?: (id: string, title: string, content: string) => void;
}

const MemoInput = ({ memoToEdit, onCancelEdit, onUpdateMemo }: MemoInputProps) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isPreview, setIsPreview] = useState(false);

    useEffect(() => {
        if (memoToEdit) {
            setTitle(memoToEdit.title);
            setContent(memoToEdit.content || '');
        } else {
            setTitle('');
            setContent('');
        }
        setIsPreview(false); // 수정 시 항상 편집 모드로 시작
    }, [memoToEdit]);

    const handleSave = async () => {
        if (!title.trim()) {
            Toast.show({
                type: 'info',
                text1: '입력 확인',
                text2: '제목을 입력해주세요.'
            });
            return;
        }

        try {
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
                Toast.show({
                    type: 'success',
                    text1: '저장 완료',
                    text2: '새로운 메모가 추가되었습니다. 📝'
                });
            }
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: '저장 실패',
                text2: error.message
            });
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => setIsPreview(!isPreview)}
                    style={[styles.toggleButton, isPreview && styles.activeToggleButton]}
                >
                    <Text style={[styles.toggleText, isPreview && styles.activeToggleText]}>
                        {isPreview ? "✍️ 편집하기" : "👁️ 미리보기"}
                    </Text>
                </TouchableOpacity>
            </View>

            <TextInput 
                placeholder="제목" 
                value={title} 
                onChangeText={setTitle} 
                style={styles.input}
            />

            {isPreview ? (
                <ScrollView style={styles.previewContainer}>
                    <Markdown 
                        style={markdownStyles}
                        rules={markdownRules}
                    >
                        {content || "*내용이 없습니다.*"}
                    </Markdown>
                </ScrollView>
            ) : (
                <TextInput 
                    placeholder="마크다운으로 내용을 입력하세요..." 
                    value={content} 
                    onChangeText={setContent} 
                    style={[styles.input, styles.contentInput]}
                    multiline
                />
            )}

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
    header: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
    toggleButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    activeToggleButton: {
        backgroundColor: '#007AFF',
    },
    toggleText: {
        fontSize: 12,
        color: '#007AFF',
        fontWeight: '600'
    },
    activeToggleText: {
        color: 'white'
    },
    input: {borderWidth: 1, borderColor: '#ddd', padding: 8, marginBottom: 8, borderRadius: 4},
    contentInput: {
        minHeight: 100,
        textAlignVertical: 'top'
    },
    previewContainer: {
        height: 120, // 입력창과 비슷한 높이 유지
        padding: 8,
        backgroundColor: '#f9f9f9',
        borderRadius: 4,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#eee'
    },
    buttonContainer: { flexDirection: 'row', justifyContent: 'flex-end' }
});

const markdownStyles = {
    body: { color: '#333' },
    heading1: { fontSize: 24, fontWeight: 'bold', color: '#000', marginVertical: 8 },
    heading2: { fontSize: 20, fontWeight: 'bold', color: '#222', marginVertical: 6 },
    blockquote: { backgroundColor: '#f0f0f0', borderLeftWidth: 4, borderLeftColor: '#ccc', padding: 8 },
    code_inline: { backgroundColor: '#eee', padding: 2, borderRadius: 4, fontFamily: 'monospace' },
};

const markdownRules = {
    // 리스트 아이템 렌더링 가로채기
    list_item: (node: any, children: any, parent: any, styles: any) => {
        // 노드 트리에서 텍스트를 추출하는 보조 함수
        const flattenText = (n: any): string => {
            if (n.content) return n.content;
            if (n.children && n.children.length > 0) {
                return n.children.map(flattenText).join('');
            }
            return '';
        };

        const rawText = flattenText(node).trim();
        
        // 체크박스 패턴 확인 ([ ] 또는 [x])
        const isUnchecked = rawText.startsWith('[ ]');
        const isChecked = rawText.toLowerCase().startsWith('[x]');

        if (isUnchecked || isChecked) {
            const icon = isChecked ? '✅' : '⬜';
            // 앞의 [ ] 또는 [x] 부분을 제거하고 실제 내용만 추출
            const displayText = rawText.replace(/^\[[ xX]\]\s?/, '');
            
            return (
                <View key={node.key} style={{flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4}}>
                    <Text style={{marginRight: 6, fontSize: 16}}>{icon}</Text>
                    <Text style={[
                        styles.list_item, 
                        isChecked && {textDecorationLine: 'line-through', color: '#888'}
                    ]}>
                        {displayText}
                    </Text>
                </View>
            );
        }

        // 일반 리스트 (체크박스가 아닌 경우)
        return (
            <View key={node.key} style={{flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4}}>
                <Text style={{marginRight: 8, fontSize: 6, marginTop: 8}}>●</Text>
                <View style={{flex: 1}}>{children}</View>
            </View>
        );
    },
};

export default MemoInput;