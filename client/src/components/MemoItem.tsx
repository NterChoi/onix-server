import React from "react";
import withObservables from "@nozbe/with-observables";
import Memo from "../watermelondb/model/Memo";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";

interface MemoItemProps {
    memo: Memo;
    onDelete: (memo: Memo) => void;
    onEdit?: (memo: Memo) => void;
}

const MemoItem = ({ memo, onDelete, onEdit }: MemoItemProps) => {
    return (
        <View style={styles.container}>
            <TouchableOpacity 
                style={styles.contentContainer} 
                onPress={() => onEdit && onEdit(memo)}
            >
                <Text style={styles.title}>{memo.title || '(제목 없음)'}</Text>
                <Text style={styles.content} numberOfLines={2}>{memo.content}</Text>
                <Text style={styles.date}>{memo.createdAt.toLocaleString()}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => onDelete(memo)} style={styles.deleteButton}>
                <Text style={styles.deleteText}>삭제</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center'
    },
    contentContainer: {
        flex: 1,
        marginRight: 10
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4
    },
    content: {
        fontSize: 14,
        color: '#555',
        marginBottom: 4
    },
    date: {
        fontSize: 12,
        color: '#999'
    },
    deleteButton: {
        backgroundColor: '#ff4444',
        padding: 8,
        borderRadius: 4
    },
    deleteText: {
        color: 'white',
        fontSize: 12
    }
});

export default withObservables(['memo'], ({ memo }) => ({
    memo: memo.observe(),
}))(MemoItem);