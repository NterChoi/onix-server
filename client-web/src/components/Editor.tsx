import {useEffect, useRef} from "react";
import {basicSetup, EditorView} from "codemirror";
import {markdown} from "@codemirror/lang-markdown";
import {oneDark} from "@codemirror/theme-one-dark";

interface EditorProps {
    value: string;
    onChange: (val: string) => void;
}

export const Editor = ({value, onChange}: EditorProps) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    // 1. 초기화
    useEffect(() => {
        if (!editorRef.current) return;

        const view = new EditorView({
            doc: value,
            extensions: [
                basicSetup,
                markdown(),
                oneDark,
                EditorView.lineWrapping, // 자동 줄바꿈 추가
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