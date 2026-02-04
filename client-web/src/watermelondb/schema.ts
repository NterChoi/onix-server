import {appSchema, tableSchema} from "@nozbe/watermelondb";

export default appSchema({
    version: 1,
    tables: [
        tableSchema({
            name: 'memos',
            columns: [
                {name: 'title', type: 'string'},
                {name: 'content', type: 'string', isOptional: true},
                {name: 'version', type: 'number'},
                {name: 'user_id', type: 'string'},
                {name: 'created_at', type: 'number'},
                {name: 'updated_at', type: 'number'},
                {name: 'deleted_at', type: 'number', isOptional: true},
            ],
        }),
    ],
});