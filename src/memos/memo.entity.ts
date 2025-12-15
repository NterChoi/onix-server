import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    VersionColumn
} from "typeorm";

@Entity('memos')
export class Memo{
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, comment: '메모 제목'})
    title: string;

    @Column({ type: "text", nullable: true, comment: '메모 내용'})
    content: string;

    @VersionColumn()
    Version: number;

    @CreateDateColumn()
    CreatedAt: Date;

    @UpdateDateColumn()
    UpdatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date | null;
}