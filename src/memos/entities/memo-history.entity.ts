import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Memo } from './memo.entity';

@Entity('memo_histories')
export class MemoHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'memo_id', nullable: true, comment: '원본 메모 ID' })
  memoId: string | null;

  @Column({ type: 'varchar', length: 255, comment: '충돌된 메모 제목' })
  title: string;

  @Column({ type: 'text', nullable: true, comment: '충돌된 메모 내용' })
  content: string;

  @Column({ type: 'int', comment: '충돌된 클라이언트 버전' })
  version: number;

  @Column({ type: 'int', nullable: true, comment: '편집 시작 기준 버전(baseVersion)' })
  baseVersion: number;

  @Column({ type: 'int', comment: '충돌 당시 서버 버전' })
  serverVersion: number;

  @Column({ type: 'uuid', name: 'user_id', comment: '사용자 ID' })
  userId: string;

  @CreateDateColumn({ precision: 6 })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // 원본 메모가 삭제되어도 히스토리는 남겨두기 위해 릴레이션을 맺되 제약조건은 느슨하게 가져갈 수 있습니다.
  // 여기서는 명시적인 관계만 정의합니다.
  @ManyToOne(() => Memo, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'memo_id' })
  memo: Memo;
}
