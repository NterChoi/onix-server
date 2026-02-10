import {useEffect, useRef} from "react";
import {basicSetup, EditorView} from "codemirror";
import {markdown} from "@codemirror/lang-markdown";
import {oneDark} from "@codemirror/theme-one-dark";
import {tags as t} from "@lezer/highlight";
import {HighlightStyle, syntaxHighlighting} from "@codemirror/language";

interface EditorProps {
    value: string;
    onChange: (val: string) => void;
}

// 마크다운을 위한 커스텀 하이라이트 스타일 정의 (Live Preview 느낌)
const markdownHighlightStyle = HighlightStyle.define([
    {tag: t.heading1, fontSize: "1.8em", fontWeight: "bold", color: "#e06c75"},
    {tag: t.heading2, fontSize: "1.5em", fontWeight: "bold", color: "#d19a66"},
    {tag: t.heading3, fontSize: "1.3em", fontWeight: "bold", color: "#98c379"},
    {tag: t.strong, fontWeight: "bold", color: "#61afef"},
    {tag: t.emphasis, fontStyle: "italic", color: "#c678dd"},
    {tag: t.quote, fontStyle: "italic", color: "#abb2bf", borderLeft: "4px solid #5c6370"},
    {tag: t.link, color: "#61afef", textDecoration: "underline"},
    {tag: t.url, color: "#d19a66"},
]);

export const Editor = ({value, onChange}: EditorProps) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    useEffect(() => {
        if (!editorRef.current) return;

        // CodeMirror 초기화
        const view = new EditorView({
            doc: value,
            extensions: [
                basicSetup,
                markdown(),
                oneDark,
                EditorView.lineWrapping, // 자동 줄바꿈 추가
                EditorView.theme({
                    "&": {
                        height: "100%",
                        backgroundColor: "#282c34"
                    },
                    ".cm-content": {
                        padding: "40px 60px", 
                        fontFamily: "'Inter', 'JetBrains Mono', sans-serif",
                        lineHeight: "1.6",
                    },
                    ".cm-line": {
                        paddingBottom: "4px",
                    },
                    ".cm-gutters": {
                        display: "none" // 줄 번호 등 불필요한 요소 숨김
                    }
                }),
                syntaxHighlighting(markdownHighlightStyle), // 커스텀 하이라이팅 적용
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

    // 외부에서 value가 변경되었을 때 (메모 전환 등) 에디터 내용 동기화
    useEffect(() => {
        if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
            viewRef.current.dispatch({
                changes: {from: 0, to: viewRef.current.state.doc.length, insert: value}
            });
        }
    }, [value]);

    return <div ref={editorRef} style={{height: '100vh', fontSize: '16px'}}></div>
};
