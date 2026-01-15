import Memo from "../watermelondb/model/Memo";
import React from "react";
import {FlatList} from "react-native";
import MemoItem from "./MemoItem";
import withObservables from "@nozbe/with-observables";
import {database} from "../watermelondb/database";

interface Props {
    memos: Memo[];
    onDelete: (memo: Memo) => void
}

const MemoList: React.FC<Props> = ({memos, onDelete}) => {
    return (
        <FlatList
            data={memos}
            keyExtractor={(item) => item.id}
            renderItem={({item}) => (
                <MemoItem memo={item} onDelete={onDelete}/>
            )}/>
    );
};

const enhance = withObservables([], () => ({
    memos: database.get<Memo>('memos').query().observe(),
}));

export default enhance(MemoList);