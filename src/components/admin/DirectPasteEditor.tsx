import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';

export default function DirectPasteEditor({ onAdd, lang = 'en' }: { onAdd: (html: string) => void, lang?: 'en' | 'hi' }) {
  const editorRef = useRef<HTMLDivElement>(null);

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
          
          if (htmlEl.style.fontFamily) {
             const ff = htmlEl.style.fontFamily.toLowerCase();
             if (ff.includes('wingdings') || ff.includes('symbol') || ff.includes('webdings')) {
                const txt = htmlEl.textContent?.trim();
                if (txt?.length === 1) {
                   if (ff.includes('wingdings')) {
                      if (txt === 'w' || txt === 'v') htmlEl.textContent = '❖';
                      else if (txt === 'Ø') htmlEl.textContent = '➢';
                      else if (txt === 'ü') htmlEl.textContent = '✓';
                      else htmlEl.textContent = '•';
                   } else if (ff.includes('symbol')) {
                      if (txt === '·') htmlEl.textContent = '•';
                      else htmlEl.textContent = '•';
                   }
                } else if (txt?.length && txt.length > 1) {
                   htmlEl.textContent = '• ' + htmlEl.textContent?.substring(1);
                }
                htmlEl.style.fontFamily = 'inherit';
             }
          }
          
          if (tagName === 'ul') {
             if (!htmlEl.style.listStyleType && !htmlEl.style.listStyle) {
                 htmlEl.style.listStyleType = 'disc';
             }
             if (!htmlEl.style.marginLeft && !htmlEl.style.paddingLeft) {
                 htmlEl.style.marginLeft = '20px';
             }
          }
          if (tagName === 'ol') {
             if (!htmlEl.style.listStyleType && !htmlEl.style.listStyle) {
                 htmlEl.style.listStyleType = 'decimal';
             }
             if (!htmlEl.style.marginLeft && !htmlEl.style.paddingLeft) {
                 htmlEl.style.marginLeft = '20px';
             }
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
      
      <div className="flex flex-wrap gap-2 mb-2">
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { 
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed) {
              alert("Please select some text first to apply formatting.");
              return;
            }
            document.execCommand('bold', false, undefined); 
          }}
          className="font-bold"
        >
          B
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { 
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed) {
              alert("Please select some text first to apply formatting.");
              return;
            }
            document.execCommand('italic', false, undefined); 
          }}
          className="italic"
        >
          I
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { 
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed) {
              alert("Please select some text first to apply formatting.");
              return;
            }
            let currentSize = parseInt(document.queryCommandValue('fontSize') || '3', 10);
            if (currentSize < 7) currentSize++;
            document.execCommand('fontSize', false, currentSize.toString()); 
          }}
          title="Increase Size"
        >
          A+
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { 
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed) {
              alert("Please select some text first to apply formatting.");
              return;
            }
            let currentSize = parseInt(document.queryCommandValue('fontSize') || '3', 10);
            if (currentSize > 1) currentSize--;
            document.execCommand('fontSize', false, currentSize.toString()); 
          }}
          title="Decrease Size"
        >
          A-
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
              alert("Please select some text first to add a link.");
              return;
            }
            const range = sel.getRangeAt(0).cloneRange();
            const url = prompt('Enter URL:');
            if (url) {
               const a = document.createElement('a');
               a.href = url;
               a.target = '_blank';
               a.appendChild(range.extractContents());
               range.insertNode(a);
               sel.removeAllRanges();
               if (editorRef.current) {
                 const event = new Event('input', { bubbles: true });
                 editorRef.current.dispatchEvent(event);
               }
            }
          }}
        >
          🔗 Link
        </Button>
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
        onClick={(e) => {
          const target = e.target as HTMLElement;
          const anchor = target.closest('a');
          if (anchor) {
            e.preventDefault();
            e.stopPropagation();
            const currentHref = anchor.getAttribute('href') || (anchor as HTMLAnchorElement).href || '';
            const shouldVisit = window.confirm(`Current Link: ${currentHref}\n\nDo you want to OPEN this link in a new tab?\n(Click Cancel to edit the URL instead)`);
            if (shouldVisit) {
              window.open(currentHref, '_blank');
            } else {
              const newHref = prompt('Update Link URL (leave empty to remove link):', currentHref);
              if (newHref !== null) {
                if (newHref.trim() === '') {
                   const childNodes = Array.from(anchor.childNodes);
                   const parent = anchor.parentNode;
                   if (parent) {
                       childNodes.forEach(child => parent.insertBefore(child, anchor));
                       parent.removeChild(anchor);
                   }
                } else {
                   anchor.setAttribute('href', newHref);
                   if (!anchor.getAttribute('target')) {
                      anchor.setAttribute('target', '_blank');
                   }
                }
              }
            }
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
