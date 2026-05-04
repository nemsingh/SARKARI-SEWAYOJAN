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
          let styleText = styleBlock.innerHTML || styleBlock.innerText;
          // Clean up MS Word/Excel HTML comments surrounding CSS
          styleText = styleText.replace(/<!--/g, '').replace(/-->/g, '');
          
          const cssRegex = /([^{]+)\{([^}]+)\}/g;
          let match;
          while ((match = cssRegex.exec(styleText)) !== null) {
              const selectorStr = match[1].trim();
              const cssRulesText = match[2].trim();
              
              if (selectorStr.startsWith('@')) continue;
              
              const selectors = selectorStr.split(',').map(s => {
                  let str = s.trim();
                  // Remove pseudo-elements safely
                  str = str.replace(/:?:[a-zA-Z\-]+/g, '');
                  return str.trim();
              });

              selectors.forEach(selector => {
                  if (!selector) return;
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
      
      // Remove <style>, <meta>, <link>, and <title> tags to prevent polluting the site
      const tagsToRemove = el.querySelectorAll('style, meta, link, title');
      tagsToRemove.forEach(tag => tag.remove());

      // Ensure that tables are wrapped in overflow so they don't break the layout,
      // but retain their original MS Word/Excel widths, paddings, borders, and classes!
      const tables = el.querySelectorAll('table');
      tables.forEach(table => {
        table.classList.add('data-table');
        
        // Wrap table in overflow div
        const wrapper = document.createElement('div');
        wrapper.style.overflowX = 'auto';
        wrapper.style.width = '100%';
        wrapper.style.marginBottom = '15px';
        if (table.parentNode) {
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }
      });

      // Provide a tiny baseline sanity check for cells ONLY if they lack any border in CSS and inline style
      const cells = el.querySelectorAll('td, th');
      cells.forEach(cell => {
          const htmlCell = cell as HTMLElement;
          const style = htmlCell.style;
          
          if (!style.border && !style.borderTop && !style.borderBottom && !style.borderLeft && !style.borderRight) {
              style.border = '1px solid #d1d5db'; // Add a faint default border if entirely missing
          }
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
        
        // Provide the generated HTML exactly as it was pasted, but properly styled
        onAdd(tempDiv.innerHTML);
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
