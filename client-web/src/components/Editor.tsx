import {useEffect, useRef} from "react";
import {basicSetup, EditorView} from "codemirror";
import {keymap} from "@codemirror/view";
import {indentWithTab} from "@codemirror/commands";
import {markdown} from "@codemirror/lang-markdown";
import {GFM} from "@lezer/markdown";
import {oneDark} from "@codemirror/theme-one-dark";
import axios from "axios";
import toast from "react-hot-toast";
import { getToken } from "../utils/auth";

interface EditorProps {
    value: string;
    onChange: (val: string) => void;
    onSave?: (val: string) => void;
}

const API_BASE_URL = 'http://localhost:3000';

export const Editor = ({value, onChange, onSave}: EditorProps) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onSaveRef = useRef(onSave);

    // 이미지 업로드 핸들러
    const handleUpload = async (view: EditorView, file: File) => {
        if (!file.type.startsWith('image/')) return;

        const token = getToken();
        if (!token) {
            toast.error('로그인이 필요한 기능입니다.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        const uploadToast = toast.loading('이미지 업로드 중...');

        try {
            const response = await axios.post(`${API_BASE_URL}/uploads/image`, formData, {
                headers: { 
                    // 'Content-Type'은 삭제합니다. Axios가 FormData를 감지하여 자동으로 boundary를 포함해 설정해줍니다.
                    'Authorization': `Bearer ${token}` 
                }
            });

            const { url } = response.data;
            const fullUrl = `${API_BASE_URL}${url}`;
            const markdownImage = `\n![image](${fullUrl})\n`;

            // 커서 위치에 마크다운 삽입
            const cursor = view.state.selection.main.head;
            view.dispatch({
                changes: { from: cursor, insert: markdownImage },
                selection: { anchor: cursor + markdownImage.length }
            });

            toast.success('이미지 업로드 완료!', { id: uploadToast });
        } catch (err: any) {
            console.error('Upload error details:', err.response?.data || err.message);
            const errorMessage = err.response?.data?.message || '이미지 업로드 실패';
            toast.error(`업로드 실패: ${errorMessage}`, { id: uploadToast });
        }
    };

    // onSave가 변경될 때마다 ref 업데이트
    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    // 1. 초기화
    useEffect(() => {
        if (!editorRef.current) return;

        const view = new EditorView({
            doc: value,
            extensions: [
                basicSetup,
                markdown({ extensions: [GFM] }),
                oneDark,
                EditorView.lineWrapping, // 자동 줄바꿈 추가
                EditorView.theme({
                    "&": {
                        height: "100%",
                    },
                    ".cm-content": {
                        fontFamily: "'JetBrains Mono', monospace",
                        padding: "20px",
                    },
                    "&.cm-focused": {
                        outline: "none",
                    },
                    ".cm-activeLine": {
                        backgroundColor: "#2c313c",
                    }
                }),
                // 드래그 앤 드롭 및 붙여넣기 이벤트 처리
                EditorView.domEventHandlers({
                    drop: (event, view) => {
                        const files = event.dataTransfer?.files;
                        if (files && files.length > 0) {
                            handleUpload(view, files[0]);
                            return true;
                        }
                        return false;
                    },
                    paste: (event, view) => {
                        const files = event.clipboardData?.files;
                        if (files && files.length > 0) {
                            handleUpload(view, files[0]);
                            return true;
                        }
                        return false;
                    }
                }),
                keymap.of([
                    indentWithTab,
                    {
                        key: "Mod-s",
                        run: (view) => {
                            if (onSaveRef.current) {
                                onSaveRef.current(view.state.doc.toString());
                                return true;
                            }
                            return false;
                        }
                    }
                ]),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        onChange(update.state.doc.toString());
                    }
                }),
            ],
            parent: editorRef.current,
        });

        viewRef.current = view;

        return () => {
            view.destroy();
        };
    }, []);

    // 2. 외부에서 value가 바뀔 때 에디터 내용 동기화 (복구 기능 대응)
    useEffect(() => {
        if (viewRef.current) {
            const currentValue = viewRef.current.state.doc.toString();
            if (value !== currentValue) {
                viewRef.current.dispatch({
                    changes: {from: 0, to: currentValue.length, insert: value}
                });
            }
        }
    }, [value]);

    return <div ref={editorRef} style={{height: '100%', fontSize: '16px'}}></div>
};