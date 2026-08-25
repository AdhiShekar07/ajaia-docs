import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { fetchDocument, updateDocument } from '../api/documents';
import { getStoredUser } from '../hooks/useAuth';
import ShareModal from '../components/ShareModal';
import ImportButton from '../components/ImportButton';
import type { Document } from '../types';
import './EditorPage.css';

// ─── Save status ──────────────────────────────────────────────────────────────
type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isBlankContent(html: string) {
    return !html || html === '{}' || html === '<p></p>' || html.trim() === '';
}

// ─── Toolbar button ───────────────────────────────────────────────────────────
function ToolbarBtn({
    active,
    disabled,
    onClick,
    title,
    children,
}: {
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            className={`toolbar-btn ${active ? 'toolbar-btn--active' : ''}`}
            onClick={onClick}
            disabled={disabled}
            title={title}
            onMouseDown={(e) => e.preventDefault()} // keep editor focus
        >
            {children}
        </button>
    );
}

// ─── EditorPage ───────────────────────────────────────────────────────────────
export default function EditorPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const user = getStoredUser();

    const [doc, setDoc] = useState<Document | null>(null);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const [title, setTitle] = useState('');
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [showShare, setShowShare] = useState(false);

    // Refs so autosave closure always sees latest values
    const titleRef = useRef('');
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const docIdRef = useRef<number | null>(null);
    // Prevents autosave from firing during initial setContent population
    const isInitializedRef = useRef(false);

    const canEdit =
        doc !== null && (doc.isOwner || doc.sharePermission === 'EDIT');

    // ── TipTap editor ──────────────────────────────────────────────────────────
    const editor = useEditor({
        extensions: [StarterKit, Underline],
        content: '',
        editable: false, // set properly once doc loads
        onUpdate: ({ editor }) => {
            if (!isInitializedRef.current) return; // skip initial population
            scheduleAutosave(titleRef.current, editor.getHTML());
        },
    });

    // ── Autosave ───────────────────────────────────────────────────────────────
    const scheduleAutosave = useCallback(
        (latestTitle: string, latestContent: string) => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            setSaveStatus('unsaved');
            saveTimerRef.current = setTimeout(async () => {
                const id = docIdRef.current;
                if (!id) return;
                try {
                    setSaveStatus('saving');
                    await updateDocument(id, {
                        title: latestTitle.trim() || 'Untitled Document',
                        content: latestContent,
                    });
                    setSaveStatus('saved');
                    // Auto-clear "Saved ✓" after 3s
                    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
                    savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
                } catch {
                    setSaveStatus('error');
                }
            }, 900);
        },
        []
    );

    // ── Load document ──────────────────────────────────────────────────────────
    useEffect(() => {
        const docId = parseInt(id ?? '', 10);
        if (isNaN(docId)) {
            setPageError('Invalid document ID.');
            setLoading(false);
            return;
        }
        docIdRef.current = docId;

        fetchDocument(docId)
            .then((data) => {
                setDoc(data);
                setTitle(data.title);
                titleRef.current = data.title;
            })
            .catch((err) => {
                const status = err?.response?.status;
                if (status === 403) setPageError('You do not have access to this document.');
                else if (status === 404) setPageError('Document not found.');
                else setPageError('Failed to load the document. Please try again.');
            })
            .finally(() => setLoading(false));

        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        };
    }, [id]);

    // ── Populate editor once doc + editor are both ready ──────────────────────
    useEffect(() => {
        if (!editor || !doc) return;
        const html = isBlankContent(doc.content) ? '' : doc.content;
        // Don't emit an update event — avoids triggering autosave on initial load
        editor.commands.setContent(html);
        editor.setEditable(canEdit, false);
        // Mark as initialized so subsequent onUpdate calls autosave normally
        isInitializedRef.current = true;
    }, [editor, doc, canEdit]);

    // ── Refresh document (after share change) ─────────────────────────────────
    async function refreshDoc() {
        if (!docIdRef.current) return;
        const updated = await fetchDocument(docIdRef.current);
        setDoc(updated);
    }

    // ── Title change ───────────────────────────────────────────────────────────
    function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const v = e.target.value;
        setTitle(v);
        titleRef.current = v;
        if (editor) scheduleAutosave(v, editor.getHTML());
    }

    function handleTitleBlur() {
        if (!title.trim()) {
            const fallback = 'Untitled Document';
            setTitle(fallback);
            titleRef.current = fallback;
            if (editor) scheduleAutosave(fallback, editor.getHTML());
        }
    }

    // ─── Renders ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="ep-center">
                <span className="spinner" />
                <span className="ep-loading-text">Loading document…</span>
            </div>
        );
    }

    if (pageError) {
        return (
            <div className="ep-center">
                <div className="ep-error-box">
                    <p className="ep-error-msg">{pageError}</p>
                    <button className="btn-back" onClick={() => navigate('/dashboard')}>
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="ep-root">
            {/* ── Top bar ────────────────────────────────────────────────────────── */}
            <div className="ep-topbar">
                <button className="btn-back" onClick={() => navigate('/dashboard')}>
                    ← Documents
                </button>

                <input
                    className="ep-title-input"
                    value={title}
                    onChange={handleTitleChange}
                    onBlur={handleTitleBlur}
                    disabled={!canEdit}
                    placeholder="Untitled Document"
                    maxLength={200}
                    aria-label="Document title"
                />

                <div className="ep-topbar-right">
                    <span className={`save-status save-status--${saveStatus}`}>
                        {saveStatus === 'saving' && 'Saving…'}
                        {saveStatus === 'saved' && 'Saved ✓'}
                        {saveStatus === 'error' && (
                            <span className="save-error">
                                Save failed
                                <button
                                    onClick={() =>
                                        editor && scheduleAutosave(titleRef.current, editor.getHTML())
                                    }
                                >
                                    Retry
                                </button>
                            </span>
                        )}
                    </span>
                    {!canEdit && doc && (
                        <span className="view-only-badge">View only</span>
                    )}
                    <button
                        className="btn-share"
                        title={doc?.isOwner ? 'Share document' : 'Only the owner can share'}
                        disabled={!doc?.isOwner}
                        onClick={() => setShowShare(true)}
                        style={doc?.isOwner ? { cursor: 'pointer', color: '#4f46e5', borderColor: '#a5b4fc' } : {}}
                    >
                        Share
                    </button>
                </div>
            </div>

            {/* ── Toolbar ────────────────────────────────────────────────────────── */}
            <div className={`ep-toolbar ${!canEdit ? 'ep-toolbar--disabled' : ''}`}>
                <div className="toolbar-group">
                    <ToolbarBtn
                        active={editor?.isActive('bold')}
                        disabled={!canEdit}
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        title="Bold (Ctrl+B)"
                    >
                        <strong>B</strong>
                    </ToolbarBtn>
                    <ToolbarBtn
                        active={editor?.isActive('italic')}
                        disabled={!canEdit}
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        title="Italic (Ctrl+I)"
                    >
                        <em>I</em>
                    </ToolbarBtn>
                    <ToolbarBtn
                        active={editor?.isActive('underline')}
                        disabled={!canEdit}
                        onClick={() => editor?.chain().focus().toggleUnderline().run()}
                        title="Underline (Ctrl+U)"
                    >
                        <u>U</u>
                    </ToolbarBtn>
                </div>

                <div className="toolbar-divider" />

                <div className="toolbar-group">
                    <ToolbarBtn
                        active={editor?.isActive('heading', { level: 1 })}
                        disabled={!canEdit}
                        onClick={() =>
                            editor?.chain().focus().toggleHeading({ level: 1 }).run()
                        }
                        title="Heading 1"
                    >
                        H1
                    </ToolbarBtn>
                    <ToolbarBtn
                        active={editor?.isActive('heading', { level: 2 })}
                        disabled={!canEdit}
                        onClick={() =>
                            editor?.chain().focus().toggleHeading({ level: 2 }).run()
                        }
                        title="Heading 2"
                    >
                        H2
                    </ToolbarBtn>
                    <ToolbarBtn
                        active={
                            editor
                                ? !editor.isActive('heading') &&
                                !editor.isActive('bulletList') &&
                                !editor.isActive('orderedList')
                                : false
                        }
                        disabled={!canEdit}
                        onClick={() => editor?.chain().focus().setParagraph().run()}
                        title="Paragraph"
                    >
                        ¶
                    </ToolbarBtn>
                </div>

                <div className="toolbar-divider" />

                <div className="toolbar-group">
                    <ToolbarBtn
                        active={editor?.isActive('bulletList')}
                        disabled={!canEdit}
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                        title="Bulleted list"
                    >
                        ≡•
                    </ToolbarBtn>
                    <ToolbarBtn
                        active={editor?.isActive('orderedList')}
                        disabled={!canEdit}
                        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                        title="Numbered list"
                    >
                        ≡1
                    </ToolbarBtn>
                </div>

                <div className="toolbar-divider" />
                <ImportButton editor={editor} disabled={!canEdit} />
            </div>

            {/* ── Editor area ────────────────────────────────────────────────────── */}
            <div className="ep-body">
                <div className="ep-paper">
                    <EditorContent editor={editor} className="ep-editor-content" />
                </div>
            </div>

            {/* ── Share modal ─────────────────────────────────────────────────────── */}
            {showShare && doc && user && (
                <ShareModal
                    doc={doc}
                    currentUserId={user.id}
                    onClose={() => setShowShare(false)}
                    onUpdated={() => {
                        refreshDoc();
                    }}
                />
            )}
        </div>
    );
}
