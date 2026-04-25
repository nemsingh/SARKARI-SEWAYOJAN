import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';

export default function DirectPasteEditor({ onAdd, lang = 'en' }: { onAdd: (html: string) => void, lang?: 'en' | 'hi' }) {
  const editorRef = useRef<HTMLDivElement>(null);

  const handleAdd = () => {
    if (editorRef.current) {
      const el = document.createElement('div');
      el.innerHTML = editorRef.current.innerHTML;
      
      const tables = el.querySelectorAll('table');
      tables.forEach(table => {
        table.classList.add('w-full', 'border-collapse');
        // Remove fixed widths so it expands fully
        table.style.width = '100%';
        table.removeAttribute('width');
      });

      const html = el.innerHTML;
      if (html.trim() !== '') {
        onAdd(html);
        editorRef.current.innerHTML = '';
      }
    }
  };

  return (
    <div className="mt-6 p-4 rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800/50">
      <h3 className="text-md font-bold text-primary mb-1">
        {lang === 'en' ? 'Direct Table Paste Box (MS Excel)' : 'Direct Table Paste Box - Hindi (MS Excel)'}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Select and copy a table from original Microsoft Office Excel, and paste it directly into this box. It will retain original formatting exactly.
      </p>
      
      <div 
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="paste-box w-full min-h-[150px] bg-white border border-input rounded-md p-4 overflow-auto focus:outline-none focus:ring-2 focus:ring-ring text-black post-tables-content"
        style={{ color: 'black' }}
      ></div>

      <div className="mt-3 flex justify-end">
        <Button onClick={handleAdd} type="button" className="bg-[#e4000f] hover:bg-[#c3000d] text-white">
          Add Pasted MS Excel Table
        </Button>
      </div>
    </div>
  );
}
