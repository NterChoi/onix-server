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

    useEffect(() => {
        if (!editorRef.current) return;

        // CodeMirror 초기화
        const view = new EditorView({
            doc: value,
            extensions: [
                basicSetup,
                markdown(),
                oneDark,
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

    return <div ref={editorRef} style={{height: '100vh', fontSize: '16px'}}></div>
};