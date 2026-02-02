import React from "react";
import withObservables from "@nozbe/with-observables";
import {database} from "../watermelondb/database";
import Memo from "../watermelondb/model/Memo";
import {FlatList, StyleSheet, Text, View} from "react-native";
import MemoItem from "./MemoItem";

interface MemoListProps {
    memos: Memo[];
    onDelete: (memo: Memo) => void;
    onEdit?: (memo: Memo) => void;
}

const MemoList = ({ memos, onDelete, onEdit }: MemoListProps) => {

    if (memos.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📝</Text>
                <Text style={styles.emptyTitle}>작성된 메모가 없습니다</Text>
                <Text style={styles.emptySubtitle}>
                    상단 입력창을 통해 첫 번째 메모를 기록하고{"\n"}서버와 동기화 해보세요!
                </Text>
            </View>
        );
    }

    return (
        <FlatList
            data={memos}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent} // 리스트 여백 추가
            renderItem={({item}) => (
                <MemoItem memo={item} onDelete={onDelete} onEdit={onEdit}/>
            )}/>
    );
};

const styles = StyleSheet.create({
    listContent: {
        paddingBottom: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        marginTop: 80
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginBottom: 10,
    },
    emptySubtitle: {
        fontSize: 15,
        color: '#888',
        textAlign: 'center',
        lineHeight: 22,
    }
})

const enhance = withObservables([], () => ({
    // 'memos' 테이블의 데이터를 감지하고, 생성순(createdAt)으로 정렬하여 가져옵니다.
    memos: database.get<Memo>('memos').query().observe(),
}));

export default enhance(MemoList);