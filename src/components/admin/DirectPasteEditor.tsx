import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Plus, Minus, Link as LinkIcon, Unlink } from 'lucide-react';

export default function DirectPasteEditor({ onAdd, lang = 'en' }: { onAdd: (html: string) => void, lang?: 'en' | 'hi' }) {
  const editorRef = useRef<HTMLDivElement>(null);

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleLink = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    let isLink = false;
    let node = selection.anchorNode;
    while (node && node !== editorRef.current) {
        if (node.nodeName?.toLowerCase() === 'a') {
            isLink = true;
            break;
        }
        node = node.parentNode;
    }

    if (isLink) {
        applyFormat('unlink');
    } else {
        const url = prompt('Enter link URL (Paste the URL here):', 'https://');
        if (url) {
            applyFormat('createLink', url);
            // Ensure links open in new tab
            const links = editorRef.current?.querySelectorAll('a');
            links?.forEach(a => {
                if (a.href === url || url.includes(a.href)) {
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                }
            });
        }
    }
  };

  const adjustSize = (delta: number) => {
    const selection = window.getSelection();
    if(!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const tempFontName = 'TEMP_FONT_SIZE_ADJUST';
    document.execCommand('fontName', false, tempFontName);

    const fonts = editorRef.current?.querySelectorAll(`font[face="${tempFontName}"]`);
    if(fonts && fonts.length > 0) {
        fonts.forEach(font => {
            const span = document.createElement('span');
            // Get parent's computed font size
            let parentSize = 16;
            if (font.parentNode) {
                const computed = window.getComputedStyle(font.parentNode as Element);
                parentSize = parseFloat(computed.fontSize) || 16;
            }
            // Increase/decrease by 2px
            const newSize = parentSize + (delta * 2);
            span.style.fontSize = `${newSize}px`;
            
            while(font.firstChild) span.appendChild(font.firstChild);
            font.parentNode?.replaceChild(span, font);
            
            // Remove explicit font sizes from children so they inherit
            span.querySelectorAll('*').forEach(child => {
                const childHtml = child as HTMLElement;
                if (childHtml.style.fontSize) {
                    childHtml.style.fontSize = '';
                }
            });
        });
    }
  };

  const handleAdd = () => {
    if (editorRef.current) {
      // Inline styles from <style> blocks to ensure Excel/Word styling (colors, fonts, etc.) is preserved
      const originalStyles = editorRef.current.querySelectorAll('style');
      originalStyles.forEach(styleBlock => {
          const styleText = styleBlock.innerHTML || styleBlock.innerText;
          const cssRegex = /([a-zA-Z0-9_\-.\s#,:]+)\s*\{([^}]+)\}/g;
          let match;
          while ((match = cssRegex.exec(styleText)) !== null) {
              const selectors = match[1].split(',').map(s => s.trim());
              const cssRulesText = match[2].trim();
              selectors.forEach(selector => {
                  if (!selector || selector.includes(':') || selector.includes('@')) return;
                  try {
                      editorRef.current!.querySelectorAll(selector).forEach(node => {
                          const htmlNode = node as HTMLElement;
                          htmlNode.style.cssText += ';' + cssRulesText;
                      });
                  } catch (e) { /* ignore invalid selectors */ }
              });
          }
      });

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
          
          if (!style.border && !style.borderTop && !style.borderBottom && !style.borderLeft && !style.borderRight) {
              style.border = '1px solid #e5e7eb'; // Add default border ONLY if none exists
          }
          style.padding = '8px 12px'; // A more Excel-like padding instead of standard 12px
      });
      
      const allElements = el.querySelectorAll('*');
      allElements.forEach(element => {
          const htmlEl = element as HTMLElement;
          const tagName = htmlEl.tagName.toLowerCase();
          
          if (tagName !== 'table') {
              htmlEl.removeAttribute('class');
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
        // Ensure all links have target _blank
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        tempDiv.querySelectorAll('a').forEach(a => {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
        });
        
        onAdd(`<div style="overflow-x:auto;width:100%;">${tempDiv.innerHTML}</div>`);
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

      {/* Toolbar for the direct paste box */}
      <div className="flex bg-white dark:bg-gray-900 border border-input rounded-md text-sm mb-2 w-fit overflow-hidden divide-x divide-input">
        <button 
          title="Bold"
          type="button" 
          onClick={() => applyFormat('bold')} 
          className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold flex items-center justify-center text-primary"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button 
          title="Increase Font Size"
          type="button" 
          onClick={() => adjustSize(1)} 
          className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold flex items-center justify-center text-primary"
        >
          A<Plus className="w-3 h-3 ml-0.5" />
        </button>
        <button 
          title="Decrease Font Size"
          type="button" 
          onClick={() => adjustSize(-1)} 
          className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold flex items-center justify-center text-primary"
        >
          A<Minus className="w-3 h-3 ml-0.5" />
        </button>
        <button 
          title="Insert/Remove Link"
          type="button" 
          onClick={handleLink} 
          className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold flex items-center justify-center text-blue-600"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
      </div>
      
      <div 
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onPaste={(e) => {
          e.preventDefault();
          const pasteHtml = e.clipboardData.getData('text/html');
          const text = e.clipboardData.getData('text/plain');
          
          if (pasteHtml) {
              // Direct insertion without browser mutating/stripping the style blocks yet
              document.execCommand('insertHTML', false, pasteHtml);
          } else {
              document.execCommand('insertText', false, text);
          }
        }}
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
