'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useMemo } from 'react';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
});

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = 'Beschreibung hinzufügen...', 
  className = '',
  minHeight = '120px'
}: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const modules = useMemo(() => ({
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link'],
      ['clean']
    ],
  }), []);

  const formats = [
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link'
  ];

  if (!mounted) {
    return <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />;
  }

  return (
    <div className={`richtext-editor ${className}`}>
      <style jsx global>{`
        .richtext-editor .ql-container {
          min-height: ${minHeight};
          font-size: 14px;
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
        }
        .richtext-editor .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          background: #f9fafb;
        }
        .dark .richtext-editor .ql-toolbar {
          background: #374151;
          border-color: #4b5563;
        }
        .dark .richtext-editor .ql-container {
          border-color: #4b5563;
          background: #1f2937;
          color: #f3f4f6;
        }
        .dark .richtext-editor .ql-editor.ql-blank::before {
          color: #9ca3af;
        }
        .dark .richtext-editor .ql-stroke {
          stroke: #d1d5db;
        }
        .dark .richtext-editor .ql-fill {
          fill: #d1d5db;
        }
        .dark .richtext-editor .ql-picker-label {
          color: #d1d5db;
        }
        .richtext-editor .ql-editor {
          min-height: ${minHeight};
        }
        .richtext-editor .ql-editor p {
          margin-bottom: 0.5rem;
        }
        .richtext-editor .ql-editor ul, 
        .richtext-editor .ql-editor ol {
          padding-left: 1.5rem;
        }
      `}</style>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}

// Kompakte Variante für das Anzeigen von Richtext-Inhalt
export function RichTextDisplay({ content, className = '' }: { content: string; className?: string }) {
  if (!content || content === '<p><br></p>') {
    return null;
  }

  return (
    <div 
      className={`richtext-display prose prose-sm dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
