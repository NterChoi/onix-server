import {Model} from "@nozbe/watermelondb";
import {date, field, readonly} from "@nozbe/watermelondb/decorators";

export default class Memo extends Model {
    static table = 'memos';

    @field('title') title!: string;
    @field('content') content?: string;
    @field('version') version!: number;
    @field('last_synced_version') lastSyncedVersion!: number;
    @field('user_id') userId!: string;

    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
    @date('deleted_at') deletedAt?: Date;
}