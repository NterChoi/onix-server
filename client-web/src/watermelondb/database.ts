import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import schema from './schema';
import Memo from './model/Memo';
// 추후 Tag 모델 등 추가 시 여기에 import

const adapter = new LokiJSAdapter({
  schema,
  // (Optional) migrations,
  useWebWorker: false, // Vite 환경에서 Worker 설정 복잡도를 낮추기 위해 일단 false로 시작
  useIncrementalIndexedDB: true, // IndexedDB를 백엔드로 사용하여 데이터 영속성 보장
  onSetUpError: (error) => {
    // Database failed to load -- offer the user to reload the app or log out
    console.error('Database setup failed', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    Memo,
    // 추후 Tag 모델 추가
  ],
});
