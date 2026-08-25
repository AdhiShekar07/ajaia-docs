import { useRef } from 'react';
import { marked } from 'marked';
import type { Editor } from '@tiptap/react';
import './ImportButton.css';

interface Props {
    editor: Editor | null;
    disabled?: boolean;
}

/** Converts plain text into HTML paragraphs */
function textToHtml(text: string): string {
    return text
        .split(/\n{2,}/)
        .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
        .join('');
}

export default function ImportButton({ editor, disabled }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !editor) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const raw = ev.target?.result as string;
            let html = '';

            if (file.name.endsWith('.md')) {
                // Strip YAML frontmatter if present
                const stripped = raw.replace(/^---[\s\S]*?---\n?/, '');
                html = marked.parse(stripped, { async: false }) as string;
            } else {
                // .txt — wrap paragraphs
                html = textToHtml(raw);
            }

            editor.chain().focus().setContent(html).run();
        };
        reader.readAsText(file);

        // Reset so the same file can be re-imported
        e.target.value = '';
    }

    return (
        <>
            <input
                ref={inputRef}
                type="file"
                accept=".txt,.md"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
            <button
                type="button"
                className="import-btn"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                title="Import .txt or .md file"
            >
                ↑ Import
            </button>
        </>
    );
}
