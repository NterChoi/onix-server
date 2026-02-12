import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
    content: string;
}

export const MarkdownPreview = ({ content }: MarkdownPreviewProps) => {
    return (
        <div className="markdown-preview" style={styles.container}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
            </ReactMarkdown>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        flex: 1,
        padding: '20px',
        color: '#abb2bf',
        backgroundColor: '#282c34',
        overflowY: 'auto',
        borderLeft: '1px solid #3e4451',
        fontSize: '16px',
        lineHeight: '1.6',
    }
};
