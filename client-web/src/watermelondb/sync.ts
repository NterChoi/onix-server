import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from './database';
import { Q } from '@nozbe/watermelondb'; // Q 임포트 추가
import axios from 'axios';
import { getToken } from '../utils/auth';

const API_BASE_URL = 'http://localhost:3000';

export async function syncOnix() {
  const token = getToken();
  if (!token) {
    throw new Error('인증 토큰이 없습니다. 로그인이 필요합니다.');
  }

  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt }) => {
      // 서버가 Date 객체를 기대하므로 변환 (처음이면 null)
      const lastPulledAtDate = lastPulledAt ? new Date(lastPulledAt) : null;
      
      const response = await axios.post(`${API_BASE_URL}/memos/pull`, 
        { lastPulledAt: lastPulledAtDate },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status !== 200 && response.status !== 201) {
        throw new Error('Pull failed');
      }

      // 서버의 응답 구조를 WatermelonDB가 기대하는 { memos: { updated, deleted } } 형태로 변환
      const { changes: serverChanges, latestPulledAt } = response.data;
      const timestamp = new Date(latestPulledAt).getTime();
      
      const changes = {
        memos: {
          created: [],
          updated: (serverChanges.updated || []).map((m: any) => ({
            ...m,
            last_synced_version: m.version // 서버에서 내려준 버전을 기준 버전으로 기록
          })),
          deleted: serverChanges.deleted || []
        }
      };
      
      return { changes, timestamp };
    },
    pushChanges: async ({ changes }) => {
      const memos = changes.memos;
      if (!memos) return;

      const { created, updated, deleted } = memos;

      const pushedMemos = [
        ...created.map((m: any) => ({
          id: m.id,
          title: m.title || '',
          content: m.content || '',
          version: m.version || 1,
          baseVersion: m.last_synced_version || 0, // 생성 시에는 0 혹은 기본값
          createdAt: new Date(m.created_at),
          updatedAt: new Date(m.updated_at),
          deletedAt: null
        })),
        ...updated.map((m: any) => ({
          id: m.id,
          title: m.title || '',
          content: m.content || '',
          version: m.version || 1,
          baseVersion: m.last_synced_version || m.version - 1, // 수정 시 baseVersion 전달
          createdAt: new Date(m.created_at),
          updatedAt: new Date(m.updated_at),
          deletedAt: null
        })),
        ...deleted.map((id: string) => ({
          id,
          title: '',
          content: '',
          version: 0,
          baseVersion: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: new Date()
        }))
      ];

      if (pushedMemos.length === 0) return;

      try {
        const response = await axios.post(
          `${API_BASE_URL}/memos/push`,
          { pushedMemos },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.status !== 201 && response.status !== 200) {
          throw new Error('Push failed');
        }

        const { results } = response.data;
        const conflicts = results.filter((r: any) => r.status === 'CONFLICT');

        if (conflicts.length > 0) {
          const conflictIds = conflicts.map((c: any) => c.id);
          const error = new Error('CONFLICT_DETECTED') as any;
          error.conflictIds = conflictIds; // 충돌 난 ID들을 에러 객체에 담아 전달
          throw error;
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          console.error('Push Server Error Detail:', error.response.data);
        }
        throw error;
      }
    },
  });
}
