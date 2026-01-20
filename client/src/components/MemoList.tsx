import React from "react";
import withObservables from "@nozbe/with-observables";
import {database} from "../watermelondb/database";
import Memo from "../watermelondb/model/Memo";
import {FlatList, Text, View} from "react-native";
import MemoItem from "./MemoItem";

interface MemoListProps {
    memos: Memo[];
    onDelete: (memo: Memo) => void;
    onEdit?: (memo: Memo) => void;
}

const MemoList = ({ memos, onDelete, onEdit }: MemoListProps) => {

    if (memos.length === 0) {
        return (
            <View style={{padding: 20, alignItems: 'center'}}>
                <Text>메모가 없습니다.</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={memos}
            keyExtractor={(item) => item.id}
            renderItem={({item}) => (
                <MemoItem memo={item} onDelete={onDelete} onEdit={onEdit}/>
            )}/>
    );
};

const enhance = withObservables([], () => ({
    // 'memos' 테이블의 데이터를 감지하고, 생성순(createdAt)으로 정렬하여 가져옵니다.
    memos: database.get<Memo>('memos').query().observe(),
}));

export default enhance(MemoList);