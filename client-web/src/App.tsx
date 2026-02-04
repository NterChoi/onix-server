import { useState, useEffect } from 'react'
import { Editor } from "./components/Editor.tsx";
import { database } from './watermelondb/database';
import Memo from './watermelondb/model/Memo';

function App() {
    const [memo, setMemo] = useState<Memo | null>(null);
    const [loading, setLoading] = useState(true);

    // 1. 초기 로드: DB에서 첫 번째 메모를 가져옵니다.
    useEffect(() => {
        async function loadMemo() {
            try {
                const memos = await database.get<Memo>('memos').query().fetch();
                if (memos.length > 0) {
                    setMemo(memos[0]);
                } else {
                    // 데이터가 없으면 환영 메모 생성
                    await database.write(async () => {
                        const newMemo = await database.get<Memo>('memos').create((m) => {
                            m.title = '환영합니다!';
                            m.content = '# 🚀 Onix Web에 오신 것을 환영합니다\n\n이곳에 메모를 작성하면 자동으로 저장됩니다.';
                            m.version = 1;
                            m.userId = 'guest';
                        });
                        setMemo(newMemo);
                    });
                }
            } catch (err) {
                console.error('DB Load Error:', err);
            } finally {
                setLoading(false);
            }
        }
        loadMemo();
    }, []);

    // 2. 내용 변경 시 자동 저장
    const handleSave = async (newContent: string) => {
        if (!memo) return;
        try {
            await database.write(async () => {
                await memo.update((m) => {
                    m.content = newContent;
                    // 첫 번째 줄을 제목으로 추출 (# 제목 형태 대응)
                    const lines = newContent.split('\n');
                    const firstLine = lines[0].replace(/^#\s+/, '').substring(0, 50);
                    if (firstLine) m.title = firstLine;
                });
            });
        } catch (err) {
            console.error('Save Error:', err);
        }
    };

    if (loading) return <div style={{color: 'white', padding: 20}}>Loading DB...</div>;

    return (
        <div style={{width: '100vw', height: '100vh', backgroundColor: '#282c34'}}>
            <Editor value={memo?.content || ''} onChange={handleSave}></Editor>
        </div>
    )
}

export default App
