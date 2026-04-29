import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';

export default function DirectPasteEditor({ onAdd, lang = 'en' }: { onAdd: (html: string) => void, lang?: 'en' | 'hi' }) {
  const editorRef = useRef<HTMLDivElement>(null);

  const handleAdd = () => {
    if (editorRef.current) {
      const el = document.createElement('div');
      el.innerHTML = editorRef.current.innerHTML;
      
      // Remove <style> and <meta> tags completely
      const stylesAndMetas = el.querySelectorAll('style, meta, link');
      stylesAndMetas.forEach(tag => tag.remove());

      const tables = el.querySelectorAll('table');
      tables.forEach(table => {
        table.removeAttribute('class');
        table.classList.add('data-table');
        table.style.margin = '0 auto';
        table.style.width = '100%';
        table.style.tableLayout = 'auto';
        table.style.borderCollapse = 'collapse';
        table.style.marginTop = '15px';
        table.style.wordBreak = 'break-word';
        table.removeAttribute('width');
        
        // Wrap table in overflow div to match ExcelEditor behavior
        const wrapper = document.createElement('div');
        wrapper.style.overflowX = 'auto';
        wrapper.style.width = '100%';
        if (table.parentNode) {
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }
      });

      const cells = el.querySelectorAll('td, th');
      cells.forEach(cell => {
          const htmlCell = cell as HTMLElement;
          htmlCell.removeAttribute('width');
          htmlCell.removeAttribute('height');
          htmlCell.removeAttribute('valign');

          const style = htmlCell.style;
          
          style.border = '';
          style.borderTop = '';
          style.borderBottom = '';
          style.borderLeft = '';
          style.borderRight = '';
          style.borderColor = '';
          
          style.padding = '12px';
      });
      
      const allElements = el.querySelectorAll('*');
      allElements.forEach(element => {
          const htmlEl = element as HTMLElement;
          const tagName = htmlEl.tagName.toLowerCase();
          
          if (tagName !== 'table') {
              htmlEl.removeAttribute('class');
          }
          
          const style = htmlEl.style;
          if (!style) return;
          
          // Remove default styling so it inherits from UI theme
          const colorStyles = [style.color.replace(/\s+/g, ''), style.backgroundColor.replace(/\s+/g, ''), style.background.replace(/\s+/g, '')];

          if (colorStyles[0] === 'windowtext' || colorStyles[0] === 'black' || colorStyles[0] === '#000000' || colorStyles[0] === 'rgb(0,0,0)' || colorStyles[0] === 'initial' || colorStyles[0] === '#0b3d91' || colorStyles[0] === 'rgb(11,61,145)' || colorStyles[0] === 'rgba(11,61,145,1)') {
               style.color = '';
          }
          if (colorStyles[1] === 'transparent' || colorStyles[1] === 'white' || colorStyles[1] === '#ffffff' || colorStyles[1] === 'rgb(255,255,255)' || colorStyles[1] === 'initial') {
               style.backgroundColor = '';
          }
          if (colorStyles[2] === 'transparent' || colorStyles[2] === 'white' || colorStyles[2] === '#ffffff' || colorStyles[2] === 'rgb(255,255,255)' || colorStyles[2] === 'initial') {
               style.background = '';
          }
          
          if (style.fontFamily) {
              const font = style.fontFamily.toLowerCase();
              if (font.includes('calibri') || font.includes('arial') || font.includes('times new roman') || font.includes('segoe ui') || font.includes('helvetica') || font.includes('sans-serif')) {
                  style.fontFamily = '';
              }
          }
          if (style.fontSize) {
               if (style.fontSize === '11pt' || style.fontSize === '14.6667px' || style.fontSize === '10pt' || style.fontSize === '10.5pt' || style.fontSize === '12pt' || style.fontSize === '16px') {
                    style.fontSize = '';
               }
          }
          
          // Clean legacy HTML attributes too
          const attrColor = htmlEl.getAttribute('color');
          if (attrColor && (attrColor.toLowerCase() === '#000000' || attrColor.toLowerCase() === 'black' || attrColor.toLowerCase() === 'windowtext' || attrColor.toLowerCase() === '#0b3d91')) {
              htmlEl.removeAttribute('color');
          }
          const attrFace = htmlEl.getAttribute('face');
          if (attrFace && (attrFace.toLowerCase().includes('calibri') || attrFace.toLowerCase().includes('arial') || attrFace.toLowerCase().includes('times new roman') || attrFace.toLowerCase().includes('segoe ui') || attrFace.toLowerCase().includes('sans-serif'))) {
              htmlEl.removeAttribute('face');
          }
          const attrBgColor = htmlEl.getAttribute('bgcolor');
          if (attrBgColor && (attrBgColor.toLowerCase() === '#ffffff' || attrBgColor.toLowerCase() === 'white' || attrBgColor.toLowerCase() === 'transparent')) {
              htmlEl.removeAttribute('bgcolor');
          }
      });
      
      const paragraphs = el.querySelectorAll('p');
      paragraphs.forEach(p => {
          const htmlP = p as HTMLElement;
          htmlP.style.margin = '0';
          htmlP.style.textIndent = '0';
      });

      const html = el.innerHTML;
      if (html.trim() !== '') {
        onAdd(`<div style="overflow-x:auto;width:100%;">${html}</div>`);
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
        className="paste-box w-full min-h-[150px] bg-white border border-input rounded-md p-4 overflow-auto focus:outline-none focus:ring-2 focus:ring-ring post-tables-content"
      ></div>

      <div className="mt-3 flex justify-end">
        <Button onClick={handleAdd} type="button" className="bg-[#e4000f] hover:bg-[#c3000d] text-white">
          Add Pasted MS Excel Table
        </Button>
      </div>
    </div>
  );
}
