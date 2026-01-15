import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import withObservables from "@nozbe/with-observables";
import Memo from "../watermelondb/model/Memo";

interface Props {
    memo: Memo;
    onDelete: (memo: Memo) => void;
}

const MemoItem: React.FC<Props> = ({memo, onDelete}) => {
    return (
        <View style={styles.container}>
            <View style={styles.contentContainer}>
                <Text style={styles.title}>{memo.title || '(제목 없음)'}</Text>
                <Text style={styles.content} numberOfLines={2}>{memo.content}</Text>
                <Text style={styles.date}>{memo.createdAt.toLocaleString()}</Text>
            </View>
            <TouchableOpacity onPress={() => onDelete(memo)} style={styles.deleteButton}>
                <Text style={styles.deleteText}>삭제</Text>
            </TouchableOpacity>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        flexDirection: 'row',
        alignItems: 'center'
    },
    contentContainer: {flex: 1},
    title: {fontSize: 16, fontWeight: 'bold'},
    content: {fontSize: 14, color: '#666'},
    date: {fontSize: 12, color: '#999'},
    deleteButton: {padding: 8, backgroundColor: '#ffeeee', borderRadius: 4},
    deleteText: {color: 'red', fontSize: 12},
});

const enhance = withObservables(['memo'], ({memo}) => ({
    memo: memo.observe(),
}));

export default enhance(MemoItem);