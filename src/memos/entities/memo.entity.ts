import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity, JoinColumn, ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    VersionColumn
} from "typeorm";
import {User} from "../../users/entities/user.entity";

@Entity('memos')
export class Memo{
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, comment: '메모 제목'})
    title: string;

    @Column({ type: "text", nullable: true, comment: '메모 내용'})
    content: string;

    @VersionColumn()
    version: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date | null;

    @Column({ type: 'uuid', name: 'user_id', comment: '사용자 ID'})
    userId: string;

    @ManyToOne(() => User, (user) => user.memos, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'user_id'})
    user: User;
}