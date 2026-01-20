import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";

import schema from './schema'
import migrations from './migrations';
import {Database} from "@nozbe/watermelondb";
import Memo from "./model/Memo";

const adapter = new SQLiteAdapter({
    schema,
    migrations,
});

export const database = new Database({
    adapter,
    modelClasses: [Memo],
})