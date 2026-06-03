import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface CellData {
  text: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  textDecoration: string;
  textAlign: string;
  verticalAlign: string;
  color: string;
  backgroundColor: string;
  borderAll: boolean;
  borderOutside: boolean;
  colSpan: number;
  rowSpan: number;
  hidden: boolean;
  isHeader?: boolean;
}

const defaultCell = (): CellData => ({
  text: '',
  fontFamily: 'inherit',
  fontSize: '19px',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'left',
  verticalAlign: 'middle',
  color: 'inherit',
  backgroundColor: '#ffffff',
  borderAll: true,
  borderOutside: false,
  colSpan: 1,
  rowSpan: 1,
  hidden: false,
  isHeader: false,
});

const TOTAL_ROWS = 100;
const TOTAL_COLS = 26;

const createEmptyGrid = (): CellData[][] => {
  const rows: CellData[][] = [];
  for (let r = 0; r < TOTAL_ROWS; r++) {
    const row: CellData[] = [];
    for (let c = 0; c < TOTAL_COLS; c++) row.push(defaultCell());
    rows.push(row);
  }
  return rows;
};

const parseHtmlToGrid = (html: string): CellData[][] => {
  const rows = createEmptyGrid();
  if (!html) return rows;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Try to parse <style> blocks manually for better MS Excel support
  doc.querySelectorAll('style').forEach(styleBlock => {
    const styleText = styleBlock.innerHTML || styleBlock.innerText;
    const cssRegex = /([a-zA-Z0-9_\-.\s#,:]+)\s*\{([^}]+)\}/g;
    let match;
    while ((match = cssRegex.exec(styleText)) !== null) {
      const selectors = match[1].split(',').map(s => s.trim());
      const cssRulesText = match[2].trim();
      selectors.forEach(selector => {
        if (!selector || selector.includes(':') || selector.includes('@')) return;
        try {
          doc.querySelectorAll(selector).forEach(node => {
            const htmlNode = node as HTMLElement;
            if (htmlNode.style) {
              htmlNode.style.cssText += ';' + cssRulesText;
            }
          });
        } catch (e) { /* ignore invalid selectors */ }
      });
    }
  });

  const table = doc.querySelector('table');
  if (!table) return rows;

  const trs = table.querySelectorAll('tr');
  let r = 0;
  const occupied = Array(TOTAL_ROWS).fill(0).map(() => Array(TOTAL_COLS).fill(false));

  trs.forEach((tr) => {
    if (r >= TOTAL_ROWS) return;
    const tds = tr.querySelectorAll('td, th');
    let c = 0;

    tds.forEach((tdCell) => {
      const td = tdCell as HTMLElement;
      while (c < TOTAL_COLS && occupied[r][c]) {
        c++;
      }
      if (c >= TOTAL_COLS) return;

      const cell = rows[r][c];
      const tdClone = td.cloneNode(true) as HTMLElement;
      tdClone.querySelectorAll('style, meta, link, script').forEach(el => el.remove());
      cell.text = tdClone.innerHTML;
      if (td.tagName.toLowerCase() === 'th') {
        cell.isHeader = true;
      }
      
      const colSpan = parseInt(td.getAttribute('colspan') || '1');
      const rowSpan = parseInt(td.getAttribute('rowspan') || '1');
      cell.colSpan = colSpan;
      cell.rowSpan = rowSpan;

      for (let rr = 0; rr < rowSpan; rr++) {
        for (let cc = 0; cc < colSpan; cc++) {
          if (r + rr < TOTAL_ROWS && c + cc < TOTAL_COLS) {
            occupied[r + rr][c + cc] = true;
            if (rr > 0 || cc > 0) {
              rows[r + rr][c + cc].hidden = true;
            }
          }
        }
      }

      // Read computed properties from td.style instead of parsing string
      const st = td.style;

      if (st.color) {
        const c = st.color.replace(/\s/g, '').toLowerCase();
        if (c === '#0b3d91' || c === 'rgb(11,61,145)') {
          cell.color = 'inherit';
        } else {
          cell.color = cssColorToHex(st.color);
        }
      } else {
        cell.color = 'inherit';
      }

      if (st.backgroundColor) cell.backgroundColor = cssColorToHex(st.backgroundColor);
      if (st.background) {
         // handle shorthand background that might contain color
         const bg = st.background;
         if (bg.includes('rgb') || bg.includes('#')) {
            const match = bg.match(/(rgb\([^)]+\)|#[0-9a-fA-F]{3,6})/);
            if (match) cell.backgroundColor = cssColorToHex(match[0]);
         }
      }
      
      const bgColorAttr = td.getAttribute('bgcolor');
      if (bgColorAttr && !st.backgroundColor && !st.background) {
         cell.backgroundColor = cssColorToHex(bgColorAttr);
      }

      if (st.fontWeight) cell.fontWeight = st.fontWeight;
      if (st.fontStyle) cell.fontStyle = st.fontStyle;
      if (st.textDecoration) cell.textDecoration = st.textDecoration;
      if (st.textAlign) cell.textAlign = st.textAlign;
      if (st.verticalAlign) cell.verticalAlign = st.verticalAlign;
      
      if (st.fontFamily) {
        const ff = st.fontFamily.replace(/['"]/g, '').toLowerCase();
        if (ff.includes('arial') || ff.includes('tahoma') || ff.includes('inherit')) {
          cell.fontFamily = 'inherit';
        } else {
          cell.fontFamily = st.fontFamily;
        }
      } else {
        cell.fontFamily = 'inherit';
      }
      
      if (st.fontSize) cell.fontSize = st.fontSize;
      
      if (st.border || st.borderTop || st.borderBottom || st.borderLeft || st.borderRight) {
        cell.borderAll = true;
      }

      c++;
    });
    r++;
  });

  return rows;
};

interface ExcelEditorProps {
  onAddTable: (html: string) => void;
  onUpdateTable?: (html: string) => void;
  onCancelEdit?: () => void;
  initialHtml?: string;
  isEditing?: boolean;
  lang?: string;
  channelId?: string;
}

const cssColorToHex = (colorString: string) => {
  if (!colorString) return '#ffffff';
  if (colorString === 'transparent') return 'transparent';
  if (colorString.startsWith('#')) return colorString;
  
  const ctx = document.createElement('canvas').getContext('2d');
  if (ctx) {
     ctx.fillStyle = colorString;
     return ctx.fillStyle;
  }
  
  const rgb = colorString.match(/\d+/g);
  if (!rgb || rgb.length < 3) return colorString;
  return '#' + rgb.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
};

const ExcelEditor = ({ onAddTable, onUpdateTable, onCancelEdit, initialHtml, isEditing, lang, channelId }: ExcelEditorProps) => {
  const [grid, setGrid] = useState<CellData[][]>(() => createEmptyGrid());

  const [selectedCells, setSelectedCells] = useState<{ row: number; col: number }[]>([]);
  const [activeCell, setActiveCellState] = useState<{ row: number; col: number } | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [selectionDragMode, setSelectionDragMode] = useState<'none' | 'top-left' | 'bottom-right'>('none');
  const [zoom, setZoom] = useState(100);
  const [startCell, setStartCell] = useState<{ row: number; col: number } | null>(null);
  const [formulaValue, setFormulaValue] = useState('');
  const [currentFont, setCurrentFont] = useState('Arial');
  const [currentFontSize, setCurrentFontSize] = useState('18');
  const [textColorHex, setTextColorHex] = useState('');
  const [bgColorHex, setBgColorHex] = useState('');
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    justifyFull: false,
  });
  const [clipboardData, setClipboardData] = useState<{ text: string; style: Partial<CellData> }[]>([]);
  const [clipboardRange, setClipboardRange] = useState<{ rows: number; cols: number; data: { text: string; style: Partial<CellData> }[][] } | null>(null);
  const [colWidths, setColWidths] = useState<number[]>(Array(TOTAL_COLS).fill(80));
  const [rowHeights, setRowHeights] = useState<number[]>(Array(TOTAL_ROWS).fill(24));
  const [selectedRowHeader, setSelectedRowHeader] = useState<number | null>(null);
  const [selectedColHeader, setSelectedColHeader] = useState<number | null>(null);
  const gridRef = useRef<HTMLTableElement>(null);
  const savedSelectionRange = useRef<Range | null>(null);
  const skipHtmlUpdateForCell = useRef<{row: number, col: number} | null>(null);

  const [historyState, setHistoryState] = useState<{ history: CellData[][][], index: number }>({
    history: [],
    index: -1
  });
  const isUndoRedoAction = useRef(false);

  // Initialize history with empty grid
  useEffect(() => {
    if (historyState.history.length === 0) {
      setHistoryState({ history: [createEmptyGrid()], index: 0 });
    }
  }, [historyState.history.length]);

  // Track grid changes for history
  useEffect(() => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }
    
    setHistoryState(prev => {
      const { history, index } = prev;
      if (history.length > 0 && history[index] === grid) {
        return prev;
      }
      const newHistory = history.slice(0, index + 1);
      newHistory.push(grid);
      if (newHistory.length > 4) {
        newHistory.shift();
      }
      return { history: newHistory, index: newHistory.length - 1 };
    });
  }, [grid]);

  const handleUndo = () => {
    setHistoryState(prev => {
      if (prev.index > 0) {
        isUndoRedoAction.current = true;
        const newIndex = prev.index - 1;
        setGrid(prev.history[newIndex]);
        return { ...prev, index: newIndex };
      }
      return prev;
    });
  };

  const handleRedo = () => {
    setHistoryState(prev => {
      if (prev.index < prev.history.length - 1) {
        isUndoRedoAction.current = true;
        const newIndex = prev.index + 1;
        setGrid(prev.history[newIndex]);
        return { ...prev, index: newIndex };
      }
      return prev;
    });
  };

  const saveSelection = useCallback(() => {
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') return;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && activeCell) {
      const range = selection.getRangeAt(0);
      const td = gridRef.current?.querySelector(`td[data-row="${activeCell.row}"][data-col="${activeCell.col}"]`) as HTMLElement;
      if (td && td.contains(range.commonAncestorContainer)) {
        savedSelectionRange.current = range.cloneRange();
        
        let node = range.commonAncestorContainer as HTMLElement;
        if (node.nodeType === Node.TEXT_NODE) {
          node = node.parentElement as HTMLElement;
        }
        if (node) {
          const computedStyle = window.getComputedStyle(node);
          setCurrentFont(computedStyle.fontFamily.replace(/['"]/g, ''));
          setCurrentFontSize(computedStyle.fontSize.replace('px', ''));
          
          const newFormats = {
            bold: document.queryCommandState('bold') || computedStyle.fontWeight === 'bold' || parseInt(computedStyle.fontWeight) >= 700,
            italic: document.queryCommandState('italic') || computedStyle.fontStyle === 'italic',
            underline: document.queryCommandState('underline') || computedStyle.textDecorationLine === 'underline',
            justifyLeft: document.queryCommandState('justifyLeft') || computedStyle.textAlign === 'left',
            justifyCenter: document.queryCommandState('justifyCenter') || computedStyle.textAlign === 'center',
            justifyRight: document.queryCommandState('justifyRight') || computedStyle.textAlign === 'right',
            justifyFull: document.queryCommandState('justifyFull') || computedStyle.textAlign === 'justify',
          };
          
          setActiveFormats(prev => {
            let changed = false;
            for (const key in newFormats) {
              if (prev[key as keyof typeof prev] !== newFormats[key as keyof typeof newFormats]) {
                changed = true;
                break;
              }
            }
            return changed ? newFormats : prev;
          });
        }
      }
    }
  }, [activeCell]);

  useEffect(() => {
    document.addEventListener('selectionchange', saveSelection);
    return () => document.removeEventListener('selectionchange', saveSelection);
  }, [saveSelection]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getColLetter = (c: number) => String.fromCharCode(65 + c);
  const getCellId = (r: number, c: number) => `${getColLetter(c)}${r + 1}`;

  const getLiveHtml = (r: number, c: number, fallback: string): string => {
    if (!gridRef.current) return fallback;
    const td = gridRef.current.querySelector(`td[data-row="${r}"][data-col="${c}"]`) as HTMLElement;
    return td ? td.innerHTML : fallback;
  };

  const updateGrid = useCallback((updater: (grid: CellData[][]) => CellData[][]) => {
    setGrid(prev => updater(prev));
  }, []);

  const updateCell = useCallback((row: number, col: number, updates: Partial<CellData>) => {
    let estimatedWidth: number | null = null;
    
    updateGrid(g => {
      const newGrid = g.map(r => [...r]);
      
      // Auto-detect double stars and make bold instantly
      if (updates.text !== undefined) {
        updates.text = updates.text.replace(/\*\*(.*?)\*\*/gs, '<b>$1</b>');
        
        // Auto-adjust width estimate
        const rawText = updates.text.replace(/<[^>]+>/g, ''); 
        if (rawText && rawText.length > 10) {
          estimatedWidth = Math.min(600, Math.max(80, rawText.length * 8));
        }
      }

      newGrid[row][col] = { ...newGrid[row][col], ...updates };
      return newGrid;
    });

    if (estimatedWidth !== null) {
      setColWidths(prev => {
        if (estimatedWidth! > prev[col]) {
          const w = [...prev];
          w[col] = estimatedWidth!;
          return w;
        }
        return prev;
      });
    }
  }, [updateGrid]);

  // Mouse handlers
  const handleMouseDown = (row: number, col: number) => {
    setIsMouseDown(true);
    setStartCell({ row, col });
    setSelectedCells([{ row, col }]);
    setActiveCellState({ row, col });
    setFormulaValue(grid[row][col].text);
    
    const cell = grid[row][col];
    setCurrentFont(cell.fontFamily || 'Arial');
    setCurrentFontSize(cell.fontSize ? cell.fontSize.replace('px', '') : '18');
    setTextColorHex('');
    setBgColorHex('');
  };

  const updateSelection = (row: number, col: number) => {
    if (selectionDragMode !== 'none' && activeCell) {
      let anchorRow = activeCell.row;
      let anchorCol = activeCell.col;
      
      if (selectionDragMode === 'top-left') {
        const cell = grid[activeCell.row][activeCell.col];
        anchorRow = activeCell.row + cell.rowSpan - 1;
        anchorCol = activeCell.col + cell.colSpan - 1;
      }
      
      const newMinRow = Math.min(anchorRow, row);
      const newMaxRow = Math.max(anchorRow, row);
      const newMinCol = Math.min(anchorCol, col);
      const newMaxCol = Math.max(anchorCol, col);

      const cells: { row: number; col: number }[] = [];
      for (let r = newMinRow; r <= newMaxRow; r++) {
        for (let c = newMinCol; c <= newMaxCol; c++) {
          if (!grid[r][c].hidden) cells.push({ row: r, col: c });
        }
      }
      setSelectedCells(cells);
      return;
    }

    if (!isMouseDown || !startCell) return;
    const rowStart = Math.min(startCell.row, row);
    const rowEnd = Math.max(startCell.row, row);
    const colStart = Math.min(startCell.col, col);
    const colEnd = Math.max(startCell.col, col);
    const cells: { row: number; col: number }[] = [];
    for (let r = rowStart; r <= rowEnd; r++) {
      for (let c = colStart; c <= colEnd; c++) {
        if (!grid[r][c].hidden) cells.push({ row: r, col: c });
      }
    }
    setSelectedCells(cells);
  };

  const handleMouseOver = (row: number, col: number) => {
    updateSelection(row, col);
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent, row: number, col: number) => {
    e.preventDefault();
    setIsMouseDown(true);
    setStartCell({ row, col });
    setSelectedCells([{ row, col }]);
    setActiveCellState({ row, col });
    setFormulaValue(grid[row][col].text);
    
    const cell = grid[row][col];
    setCurrentFont(cell.fontFamily || 'Arial');
    setCurrentFontSize(cell.fontSize ? cell.fontSize.replace('px', '') : '18');
    setTextColorHex('');
    setBgColorHex('');
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMouseDown && selectionDragMode === 'none') return;
    e.preventDefault(); // Only prevent default if we are dragging
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
    const td = element?.closest('td');
    if (td?.dataset?.row && td?.dataset?.col) {
      const row = parseInt(td.dataset.row);
      const col = parseInt(td.dataset.col);
      updateSelection(row, col);
    }
  };

  useEffect(() => {
    const handleUp = () => {
      setIsMouseDown(false);
      setSelectionDragMode('none');
    };
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, []);

  // Copy/Cut/Paste
  const execCopy = () => {
    if (selectedCells.length === 0) return;
    const rows = selectedCells.map(c => c.row);
    const cols = selectedCells.map(c => c.col);
    const minRow = Math.min(...rows), maxRow = Math.max(...rows);
    const minCol = Math.min(...cols), maxCol = Math.max(...cols);
    const data: { text: string; style: Partial<CellData> }[][] = [];
    for (let r = minRow; r <= maxRow; r++) {
      const rowData: { text: string; style: Partial<CellData> }[] = [];
      for (let c = minCol; c <= maxCol; c++) {
        const cell = grid[r][c];
        rowData.push({ text: cell.text, style: { ...cell } });
      }
      data.push(rowData);
    }
    setClipboardRange({ rows: maxRow - minRow + 1, cols: maxCol - minCol + 1, data });
  };

  const execCut = () => {
    execCopy();
    updateGrid(g => {
      const newGrid = g.map(r => [...r]);
      selectedCells.forEach(({ row, col }) => {
        newGrid[row][col] = { ...newGrid[row][col], text: '' };
      });
      return newGrid;
    });
  };

  const applyRichTextFormat = (command: string, value?: string) => {
    if (!activeCell) return false;
    
    // If multiple cells are selected, we should apply to all cells via applyToSelection
    if (selectedCells.length > 1) return false;
    
    const td = gridRef.current?.querySelector(`td[data-row="${activeCell.row}"][data-col="${activeCell.col}"]`) as HTMLElement;
    if (!td) return false;

    const selection = window.getSelection();
    let range: Range | null = null;
    const activeElem = document.activeElement as HTMLElement;

    if (selection && selection.rangeCount > 0) {
      const currentRange = selection.getRangeAt(0);
      if (td.contains(currentRange.commonAncestorContainer)) {
        range = currentRange;
      }
    }

    if (!range && savedSelectionRange.current && td.contains(savedSelectionRange.current.commonAncestorContainer)) {
      range = savedSelectionRange.current;
    }

    // Only apply rich text format if we have an active cell
    // handle 'whole cell' formatting when nothing is selected, and ensure selection is preserved/restored
    const isCollapsed = !range || range.collapsed;
    
    if (activeElem !== td) {
      td.focus({ preventScroll: true });
    }

    if (isCollapsed) {
       // If nothing is selected, select the whole content first
       const newRange = document.createRange();
       newRange.selectNodeContents(td);
       if (selection) {
         selection.removeAllRanges();
         selection.addRange(newRange);
         range = newRange;
       }
    } else if (range && selection) {
       // Ensure the correct range is focused/selected
       selection.removeAllRanges();
       selection.addRange(range);
    }

    if (range) {
      try {
        document.execCommand('styleWithCSS', false, 'true');
        
        if (command === 'createLink') {
           document.execCommand(command, false, value);
           const links = td.querySelectorAll('a');
           links.forEach(a => {
             if (!a.getAttribute('target')) {
               a.setAttribute('target', '_blank');
               a.setAttribute('style', `color:${grid[activeCell.row][activeCell.col].color};text-decoration:underline;`);
             }
           });
        } else if (command === 'fontSizePx') {
           document.execCommand('styleWithCSS', false, 'false');
           document.execCommand('fontSize', false, '7');
           document.execCommand('styleWithCSS', false, 'true');
           
           const fonts = td.querySelectorAll('font[size="7"]') as NodeListOf<HTMLElement>;
           fonts.forEach(f => {
             f.removeAttribute('size');
             f.style.fontSize = value || '18px';
           });
           
           const spans = td.querySelectorAll('span') as NodeListOf<HTMLElement>;
           spans.forEach(s => {
             if (s.style.fontSize === 'xxx-large' || s.style.fontSize === '48px' || s.style.fontSize === '-webkit-xxx-large') {
               s.style.fontSize = value || '18px';
             }
           });
        } else if (command === 'fontNameCustom') {
           document.execCommand('fontName', false, value);
        } else if (command === 'removeFormat') {
           document.execCommand('removeFormat', false, value);
        } else if (command === 'justifyLeft' || command === 'justifyCenter' || command === 'justifyRight' || command === 'justifyFull') {
           document.execCommand(command, false, value);
        } else {
           document.execCommand(command, false, value);
        }

        // Update our saved selection to the newly updated live selection maintained by the browser
        if (selection && selection.rangeCount > 0) {
           savedSelectionRange.current = selection.getRangeAt(0).cloneRange();
        }

        // Restore focus to original active input if necessary (keeps typing fluent)
        if (activeElem && activeElem !== td && (activeElem.tagName === 'INPUT' || activeElem.tagName === 'SELECT')) {
          activeElem.focus();
        } else {
          // Keep selection highlighted visual for user
          if (selection && range) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
        
        // Update cell content
        updateCell(activeCell.row, activeCell.col, { text: td.innerHTML });
        if (activeCell) {
          setFormulaValue(td.innerText);
        }
        return true;
      } catch (e) {
        console.error('Rich text formatting error:', e);
        return false;
      }
    }
    return false;
  };

  const pasteData = () => {
    if (!activeCell || !clipboardRange) return;
    
    // Calculate new column widths and row heights if pasting text makes them larger
    const tdElementsToMeasure: { row: number, col: number, text: string }[] = [];
    
    updateGrid(g => {
      const newGrid = g.map(r => [...r]);
      for (let r = 0; r < clipboardRange.rows; r++) {
        for (let c = 0; c < clipboardRange.cols; c++) {
          const targetRow = activeCell.row + r;
          const targetCol = activeCell.col + c;
          if (targetRow < TOTAL_ROWS && targetCol < TOTAL_COLS) {
            const src = clipboardRange.data[r][c];
            newGrid[targetRow][targetCol] = { ...newGrid[targetRow][targetCol], text: src.text };
            tdElementsToMeasure.push({ row: targetRow, col: targetCol, text: src.text });
          }
        }
      }
      return newGrid;
    });
    
    // Set a timeout to allow DOM to render before measuring new sizes
    setTimeout(() => {
       const newColWidths = [...colWidths];
       const newRowHeights = [...rowHeights];
       let changed = false;
       
       tdElementsToMeasure.forEach(({ row, col }) => {
          const tdElement = gridRef.current?.querySelector(`td[data-row="${row}"][data-col="${col}"]`) as HTMLElement;
          if (tdElement) {
             const scrollWidth = tdElement.scrollWidth + 12;
             const scrollHeight = tdElement.scrollHeight;
             
             if (scrollWidth > newColWidths[col] && scrollWidth < 600) {
                 newColWidths[col] = scrollWidth;
                 changed = true;
             }
             if (scrollHeight > newRowHeights[row]) {
                 newRowHeights[row] = scrollHeight;
                 changed = true;
             }
          }
       });
       
       if (changed) {
           setColWidths(newColWidths);
           setRowHeights(newRowHeights);
       }
    }, 50);
  };

  const applyToSelection = (prop: keyof CellData, value: string) => {
    updateGrid(g => {
      const newGrid = g.map(r => [...r]);
      selectedCells.forEach(({ row, col }) => {
        const cell = { ...newGrid[row][col] };
        if (['fontWeight', 'fontStyle', 'textDecoration'].includes(prop)) {
          (cell as any)[prop] = (cell as any)[prop] === value ? 'normal' : value;
        } else {
          (cell as any)[prop] = value;
        }
        newGrid[row][col] = cell;

        // Clear inline conflicting spans when an entire cell format changes
        if (prop === 'fontSize' || prop === 'fontFamily' || prop === 'color') {
          const td = gridRef.current?.querySelector(`td[data-row="${row}"][data-col="${col}"]`) as HTMLElement;
          if (td) {
            const spans = td.querySelectorAll('span, font, div, p');
            let modified = false;
            spans.forEach(el => {
              const htmlEl = el as HTMLElement;
              if (prop === 'fontSize') { htmlEl.style.fontSize = ''; htmlEl.removeAttribute('size'); modified = true; }
              if (prop === 'fontFamily') { htmlEl.style.fontFamily = ''; htmlEl.removeAttribute('face'); modified = true; }
              if (prop === 'color') { htmlEl.style.color = ''; htmlEl.removeAttribute('color'); modified = true; }
            });
            if (modified) {
              skipHtmlUpdateForCell.current = { row, col };
              newGrid[row][col].text = td.innerHTML;
            }
          }
        }
      });
      return newGrid;
    });
  };

  const resetGrid = useCallback(() => {
    setGrid(createEmptyGrid());
    setSelectedCells([{ row: 0, col: 0 }]);
    setActiveCellState({ row: 0, col: 0 });
    setFormulaValue('');
    setGridKey(prev => prev + 1);
  }, []);

  const clearSelection = () => {
    resetGrid();
  };

  const clearSelectedCellsContent = () => {
    updateGrid(g => {
      const newGrid = g.map(r => [...r]);
      selectedCells.forEach(({ row, col }) => {
        newGrid[row][col] = { ...newGrid[row][col], text: '' };
        const td = gridRef.current?.querySelector(`td[data-row="${row}"][data-col="${col}"]`) as HTMLElement;
        if (td) td.innerHTML = '';
      });
      return newGrid;
    });
    if (activeCell) {
      setFormulaValue('');
    }
  };

  const mergeCells = () => {
    if (selectedCells.length < 2) return;
    const rows = selectedCells.map(c => c.row);
    const cols = selectedCells.map(c => c.col);
    const minRow = Math.min(...rows), maxRow = Math.max(...rows);
    const minCol = Math.min(...cols), maxCol = Math.max(...cols);

    updateGrid(g => {
      const newGrid = g.map(r => [...r]);
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          if (r === minRow && c === minCol) {
            newGrid[r][c].rowSpan = maxRow - minRow + 1;
            newGrid[r][c].colSpan = maxCol - minCol + 1;
            newGrid[r][c].textAlign = 'center';
          } else {
            newGrid[r][c].hidden = true;
          }
        }
      }
      return newGrid;
    });
  };

  const unmergeCells = () => {
    if (!activeCell) return;
    const cell = grid[activeCell.row][activeCell.col];
    if (cell.rowSpan <= 1 && cell.colSpan <= 1) {
      selectedCells.forEach(({ row, col }) => {
        const c = grid[row][col];
        if (c.rowSpan > 1 || c.colSpan > 1) {
          updateGrid(g => {
            const newGrid = g.map(r => [...r]);
            for (let r = row; r < row + c.rowSpan; r++) {
              for (let cc = col; cc < col + c.colSpan; cc++) {
                newGrid[r][cc].hidden = false;
                newGrid[r][cc].rowSpan = 1;
                newGrid[r][cc].colSpan = 1;
              }
            }
            return newGrid;
          });
        }
      });
      return;
    }

    updateGrid(g => {
      const newGrid = g.map(r => [...r]);
      for (let r = activeCell.row; r < activeCell.row + cell.rowSpan; r++) {
        for (let c = activeCell.col; c < activeCell.col + cell.colSpan; c++) {
          newGrid[r][c].hidden = false;
          newGrid[r][c].rowSpan = 1;
          newGrid[r][c].colSpan = 1;
        }
      }
      return newGrid;
    });
  };

  const insertRow = (above: boolean) => {
    if (!activeCell) return;
    const targetRow = activeCell.row + (above ? 0 : 1);
    updateGrid(g => {
      const newGrid = [...g];
      const newRow = Array(TOTAL_COLS).fill(0).map(() => defaultCell());
      newGrid.splice(targetRow, 0, newRow);
      if (newGrid.length > TOTAL_ROWS) newGrid.pop();
      return newGrid;
    });
    setRowHeights(prev => {
      const next = [...prev];
      next.splice(targetRow, 0, 24);
      if (next.length > TOTAL_ROWS) next.pop();
      return next;
    });
    focusDOMCell(activeCell.row, activeCell.col);
  };

  const insertCol = (left: boolean) => {
    if (!activeCell) return;
    const targetCol = activeCell.col + (left ? 0 : 1);
    updateGrid(g => {
      return g.map(row => {
        const newRow = [...row];
        newRow.splice(targetCol, 0, defaultCell());
        if (newRow.length > TOTAL_COLS) newRow.pop();
        return newRow;
      });
    });
    setColWidths(prev => {
      const next = [...prev];
      next.splice(targetCol, 0, 80);
      if (next.length > TOTAL_COLS) next.pop();
      return next;
    });
    focusDOMCell(activeCell.row, activeCell.col);
  };

  const deleteRow = () => {
    if (!activeCell) return;
    const rowIndex = activeCell.row;
    updateGrid(g => {
      const newGrid = [...g];
      newGrid.splice(rowIndex, 1);
      newGrid.push(Array(TOTAL_COLS).fill(0).map(() => defaultCell()));
      return newGrid;
    });
    setRowHeights(prev => {
      const next = [...prev];
      next.splice(rowIndex, 1);
      next.push(24);
      return next;
    });
    const nextRow = Math.min(rowIndex, TOTAL_ROWS - 1);
    focusDOMCell(nextRow, activeCell.col);
  };

  const applyBorder = (type: 'all' | 'outside' | 'none') => {
    updateGrid(g => {
      const newGrid = g.map(r => [...r]);
      if (type === 'none') {
        selectedCells.forEach(({ row, col }) => {
          newGrid[row][col].borderAll = false;
          newGrid[row][col].borderOutside = false;
        });
      } else if (type === 'all') {
        selectedCells.forEach(({ row, col }) => {
          newGrid[row][col].borderAll = true;
          newGrid[row][col].borderOutside = false;
        });
      } else {
        selectedCells.forEach(({ row, col }) => {
          newGrid[row][col].borderAll = false;
          newGrid[row][col].borderOutside = true;
        });
      }
      return newGrid;
    });
  };

  const deleteCol = () => {
    if (!activeCell) return;
    const colIndex = activeCell.col;
    updateGrid(g => {
      return g.map(row => {
        const newRow = [...row];
        newRow.splice(colIndex, 1);
        newRow.push(defaultCell());
        return newRow;
      });
    });
    setColWidths(prev => {
      const next = [...prev];
      next.splice(colIndex, 1);
      next.push(80);
      return next;
    });
    const nextCol = Math.min(colIndex, TOTAL_COLS - 1);
    focusDOMCell(activeCell.row, nextCol);
  };

  const autoSum = () => {
    if (!activeCell) return;
    let sum = 0;
    for (let i = 0; i < activeCell.row; i++) {
      const val = parseFloat(grid[i][activeCell.col].text);
      if (!isNaN(val)) sum += val;
    }
    updateCell(activeCell.row, activeCell.col, { text: sum.toString() });
    setFormulaValue(sum.toString());
  };

  const handleFormulaChange = (val: string) => {
    setFormulaValue(val);
    if (activeCell) {
      skipHtmlUpdateForCell.current = null;
      updateCell(activeCell.row, activeCell.col, { text: val });
    }
  };

  const handleCellInput = (row: number, col: number, html: string) => {
    skipHtmlUpdateForCell.current = { row, col };
    updateCell(row, col, { text: html });
    if (activeCell && activeCell.row === row && activeCell.col === col) {
      const td = gridRef.current?.querySelector(`td[data-row="${row}"][data-col="${col}"]`) as HTMLElement;
      setFormulaValue(td ? td.innerText : '');
    }
  };

  const handleKeyDownCell = (e: React.KeyboardEvent, row: number, col: number) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const sel = window.getSelection();
      // If they just selected the cell but are not editing text inside it (or selected all text)
      if (selectedCells.length > 1 || (sel && sel.toString() === (e.currentTarget as HTMLElement).innerText)) {
         e.preventDefault();
         clearSelectedCellsContent();
         return;
      }
    }
    
    if (e.key === 'Tab') {
      e.preventDefault();
      let nextRow = row;
      let nextCol = e.shiftKey ? col - 1 : col + 1;

      while (nextRow >= 0 && nextRow < TOTAL_ROWS) {
        if (nextCol >= TOTAL_COLS) {
          nextRow++;
          nextCol = 0;
        } else if (nextCol < 0) {
          nextRow--;
          nextCol = TOTAL_COLS - 1;
        }

        if (nextRow >= 0 && nextRow < TOTAL_ROWS && !grid[nextRow][nextCol].hidden) {
          focusDOMCell(nextRow, nextCol);
          break;
        }
        
        nextCol = e.shiftKey ? nextCol - 1 : nextCol + 1;
      }
    } else if (e.key === 'ArrowUp') {
      let nextRow = row - 1;
      if (e.ctrlKey || e.metaKey) nextRow = 0;
      while (nextRow >= 0 && grid[nextRow][col].hidden) nextRow--;
      if (nextRow >= 0) {
        e.preventDefault();
        focusDOMCell(nextRow, col);
      }
    } else if (e.key === 'ArrowDown') {
      let nextRow = row + 1;
      if (e.ctrlKey || e.metaKey) nextRow = TOTAL_ROWS - 1;
      while (nextRow < TOTAL_ROWS && grid[nextRow][col].hidden) nextRow++;
      if (nextRow < TOTAL_ROWS) {
        e.preventDefault();
        focusDOMCell(nextRow, col);
      }
    } else if (e.key === 'ArrowLeft') {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        focusDOMCell(row, 0);
        return;
      }
      
      const sel = window.getSelection();
      let isEdge = false;
      if (!sel || sel.isCollapsed && sel.anchorOffset === 0 || grid[row][col].text === '') isEdge = true;
      if (sel && !sel.isCollapsed) {
        const textLen = (e.currentTarget as HTMLElement).innerText.length;
        if (sel.toString().length === textLen || sel.toString().length === textLen - 1) isEdge = true;
      }
      
      if (isEdge) {
        let nextCol = col - 1;
        while (nextCol >= 0 && grid[row][nextCol].hidden) nextCol--;
        if (nextCol >= 0) {
           e.preventDefault();
           focusDOMCell(row, nextCol);
        }
      }
    } else if (e.key === 'ArrowRight') {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        focusDOMCell(row, TOTAL_COLS - 1);
        return;
      }

      const sel = window.getSelection();
      let isEdge = false;
      if (!sel || grid[row][col].text === '') isEdge = true;
      else if (sel.isCollapsed && sel.anchorNode) {
        isEdge = sel.anchorOffset === sel.anchorNode.textContent?.length;
      }
      if (sel && !sel.isCollapsed) {
        const textLen = (e.currentTarget as HTMLElement).innerText.length;
        if (sel.toString().trim().length >= textLen - 1) isEdge = true;
      }
      
      if (isEdge) {
         let nextCol = col + 1;
         while (nextCol < TOTAL_COLS && grid[row][nextCol].hidden) nextCol++;
         if (nextCol < TOTAL_COLS) {
           e.preventDefault();
           focusDOMCell(row, nextCol);
         }
      }
    }
  };

  const focusDOMCell = (r: number, c: number) => {
    setActiveCellState({row: r, col: c});
    setSelectedCells([{row: r, col: c}]);
    setTimeout(() => {
      const td = gridRef.current?.querySelector(`td[data-row="${r}"][data-col="${c}"]`) as HTMLElement;
      if (td) {
        td.focus();
        setFormulaValue(td.innerText || '');
        
        // Select all text in the cell, mirroring Excel behavior where a focused cell has its content selected
        // unless they explicitly double-click.
        const selection = window.getSelection();
        const range = document.createRange();
        if (td.childNodes.length > 0) {
          range.selectNodeContents(td);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      } else {
        setFormulaValue('');
      }
    }, 0);
  };

  const isSelected = (row: number, col: number) => selectedCells.some(c => c.row === row && c.col === col);
  const isActive = (row: number, col: number) => activeCell?.row === row && activeCell?.col === col;

  const handleColHeaderClick = (colIndex: number) => {
    const cells: { row: number; col: number }[] = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      if (!grid[r][colIndex].hidden) cells.push({ row: r, col: colIndex });
    }
    setSelectedCells(cells);
    setActiveCellState({ row: 0, col: colIndex });
    setStartCell({ row: 0, col: colIndex });
    setSelectedColHeader(colIndex);
    setSelectedRowHeader(null);
  };

  const handleRowHeaderClick = (rowIndex: number) => {
    const cells: { row: number; col: number }[] = [];
    for (let c = 0; c < TOTAL_COLS; c++) {
      if (!grid[rowIndex][c].hidden) cells.push({ row: rowIndex, col: c });
    }
    setSelectedCells(cells);
    setActiveCellState({ row: rowIndex, col: 0 });
    setStartCell({ row: rowIndex, col: 0 });
    setSelectedRowHeader(rowIndex);
    setSelectedColHeader(null);
  };

  // Auto Adjust
  const autoAdjustCols = (colIndices: number[]) => {
    setColWidths(prev => {
      const next = [...prev];
      colIndices.forEach(c => {
        let maxContentWidth = 80; // Minimum width
        grid.forEach((row, ri) => {
          const cell = row[c];
          if (!cell.hidden) {
            const tdElement = gridRef.current?.querySelector(`td[data-row="${ri}"][data-col="${c}"]`) as HTMLElement;
            if (tdElement && tdElement.textContent && tdElement.textContent.trim() !== '') {
              const clone = tdElement.cloneNode(true) as HTMLElement;
              clone.style.width = 'max-content';
              clone.style.position = 'absolute';
              clone.style.visibility = 'hidden';
              clone.style.whiteSpace = 'nowrap';
              clone.style.wordBreak = 'normal';
              clone.style.display = 'inline-block';
              document.body.appendChild(clone);
              const contentWidth = clone.getBoundingClientRect().width + 16;
              document.body.removeChild(clone);
              if (contentWidth > maxContentWidth) {
                maxContentWidth = contentWidth;
              }
            }
          }
        });
        next[c] = Math.min(maxContentWidth, 2000); // Increased max width limit from 600
      });
      return next;
    });
  };

  const autoAdjustRows = (rowIndices: number[]) => {
    setRowHeights(prev => {
      const next = [...prev];
      rowIndices.forEach(r => {
        let maxContentHeight = 24;
        grid[r].forEach((cell, ci) => {
          if (!cell.hidden) {
            const tdElement = gridRef.current?.querySelector(`td[data-row="${r}"][data-col="${ci}"]`) as HTMLElement;
            if (tdElement && tdElement.textContent && tdElement.textContent.trim() !== '') {
              const clone = tdElement.cloneNode(true) as HTMLElement;
              clone.style.height = 'auto';
              clone.style.position = 'absolute';
              clone.style.visibility = 'hidden';
              clone.style.whiteSpace = 'normal'; // Allow wrapping to correctly measure height
              clone.style.wordBreak = 'break-word';
              clone.style.width = colWidths[ci] + 'px'; // Lock width to correctly measure height
              clone.style.display = 'block';
              document.body.appendChild(clone);
              const contentHeight = clone.getBoundingClientRect().height + 4;
              document.body.removeChild(clone);
              if (contentHeight > maxContentHeight) {
                maxContentHeight = contentHeight;
              }
            }
          }
        });
        next[r] = Math.min(maxContentHeight, 400);
      });
      return next;
    });
  };

  // Column resize
  const handleColResize = (colIndex: number, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startWidth = colWidths[colIndex];
    let newWidth = startWidth;

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
      const diff = currentX - startX;
      newWidth = Math.max(30, startWidth + diff);
      // Update state during move for real-time feedback
      setColWidths(prev => { const next = [...prev]; next[colIndex] = newWidth; return next; });
    };
    const onUp = () => { 
      window.removeEventListener('mousemove', onMove as any); 
      window.removeEventListener('mouseup', onUp); 
      window.removeEventListener('touchmove', onMove as any); 
      window.removeEventListener('touchend', onUp); 
      updateSelectionRect(); // Update selection outlines when done resizing
    };
    window.addEventListener('mousemove', onMove as any);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove as any, { passive: false });
    window.addEventListener('touchend', onUp);
  };

  // Row resize
  const handleRowResize = (rowIndex: number, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startHeight = rowHeights[rowIndex];
    let newHeight = startHeight;

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const currentY = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;
      const diff = currentY - startY;
      newHeight = Math.max(15, startHeight + diff);
      // Update state during move for real-time feedback
      setRowHeights(prev => { const next = [...prev]; next[rowIndex] = newHeight; return next; });
    };
    const onUp = () => { 
      window.removeEventListener('mousemove', onMove as any); 
      window.removeEventListener('mouseup', onUp); 
      window.removeEventListener('touchmove', onMove as any); 
      window.removeEventListener('touchend', onUp); 
      updateSelectionRect(); // Update selection outlines when done resizing
    };
    window.addEventListener('mousemove', onMove as any);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove as any, { passive: false });
    window.addEventListener('touchend', onUp);
  };

  // Sync all DOM cell contents to grid state before generating HTML
  const syncDomToGrid = (): CellData[][] => {
    const newGrid = grid.map(r => r.map(c => ({ ...c })));
    if (gridRef.current) {
      const cells = gridRef.current.querySelectorAll('td[data-row][data-col]');
      cells.forEach(td => {
        const r = parseInt(td.getAttribute('data-row') || '0');
        const c = parseInt(td.getAttribute('data-col') || '0');
        if (r < newGrid.length && c < newGrid[0].length) {
          const tdClone = (td as HTMLElement).cloneNode(true) as HTMLElement;
          tdClone.querySelectorAll('style, meta, link, script').forEach(el => el.remove());
          const html = tdClone.innerHTML || '';
          // Always use innerHTML to preserve all rich text formatting (colors, bold, links, lists, etc.)
          newGrid[r][c].text = html;
        }
      });
    }
    return newGrid;
  };

  const generateTableHtml = (sourceGrid: CellData[][]): string => {
    const minRow = 0; // Fix: Always start from row 0 to prevent cutting off top padding rows added by user. If table is empty, maxRow will be -1 anyway.
    let minCol = TOTAL_COLS;
    let maxRow = -1, maxCol = -1;
    sourceGrid.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        const textContent = cell.text.replace(/<[^>]+>/g, '').trim();
        const hasContent = textContent.length > 0 || cell.text.includes('<img') || cell.text.includes('<br');
        const hasCustomStyle = cell.backgroundColor !== '#ffffff' && cell.backgroundColor !== 'transparent' && cell.backgroundColor !== '';
        // Include cells that have content, style, spans, or explicitly set border
        if (hasContent || hasCustomStyle || cell.rowSpan > 1 || cell.colSpan > 1 || cell.borderOutside) {
          minCol = Math.min(minCol, ci);
          maxRow = Math.max(maxRow, ri + cell.rowSpan - 1);
          maxCol = Math.max(maxCol, ci + cell.colSpan - 1);
        }
      });
    });

    if (maxRow === -1) return ''; // blank table

    if (minCol === TOTAL_COLS) minCol = 0;

    let html = '<div style="overflow-x:auto;width:100%;"><table class="data-table" style="width:100%;border-collapse:collapse;margin-top:15px;table-layout:auto;word-break:break-word;">\n';
    for (let r = minRow; r <= maxRow; r++) {
      html += '  <tr>\n';
      for (let c = minCol; c <= maxCol; c++) {
        const cell = sourceGrid[r][c];
        if (cell.hidden) continue;

        let style = '';
        if (cell.color && cell.color !== 'inherit') style += `color:${cell.color};`;
        if (cell.backgroundColor && cell.backgroundColor !== '#ffffff' && cell.backgroundColor !== 'transparent') style += `background-color:${cell.backgroundColor};`;
        if (cell.fontWeight && cell.fontWeight !== 'normal') style += `font-weight:${cell.fontWeight};`;
        if (cell.fontStyle && cell.fontStyle !== 'normal') style += `font-style:${cell.fontStyle};`;
        if (cell.textDecoration && cell.textDecoration !== 'none') style += `text-decoration:${cell.textDecoration};`;
        if (cell.textAlign && cell.textAlign !== 'left') style += `text-align:${cell.textAlign};`;
        if (cell.verticalAlign && cell.verticalAlign !== 'middle') style += `vertical-align:${cell.verticalAlign};`;
        if (cell.fontFamily && cell.fontFamily !== 'inherit') style += `font-family:${cell.fontFamily};`;
        if (cell.fontSize && cell.fontSize !== '19px' && cell.fontSize !== '18px') style += `font-size:${cell.fontSize};`;
        
        if (cell.borderAll) {
          style += 'border-width:1px;border-style:solid;';
        } else if (cell.borderOutside) {
          style += 'border-width:1px;border-style:solid;';
        }
        style += 'padding:12px;';

        let attrs = `style="${style}"`;
        if (cell.colSpan > 1) attrs += ` colspan="${cell.colSpan}"`;
        if (cell.rowSpan > 1) attrs += ` rowspan="${cell.rowSpan}"`;

        // Preserve HTML content (links, lists)
        let cellContent = cell.text;
        if (cellContent) {
          cellContent = cellContent.replace(/\*\*(.*?)\*\*/gs, '<b>$1</b>');
        }
        const tag = cell.isHeader ? 'th' : 'td';
        html += `    <${tag} ${attrs}>${cellContent}</${tag}>\n`;
      }
      html += '  </tr>\n';
    }
    html += '</table></div>';
    return html;
  };

  const [gridKey, setGridKey] = useState(0);

  useEffect(() => {
    if (isEditing && initialHtml) {
      setGrid(parseHtmlToGrid(initialHtml));
      setGridKey(prev => prev + 1);
      setTimeout(() => {
        const rowsToAdjust = Array.from({length: TOTAL_ROWS}, (_, i) => i);
        const colsToAdjust = Array.from({length: TOTAL_COLS}, (_, i) => i);
        autoAdjustCols(colsToAdjust);
        autoAdjustRows(rowsToAdjust);
      }, 50);
    } else if (!isEditing) {
      resetGrid();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, initialHtml, resetGrid]);

  // Inject HTML into contentEditable cells when gridKey changes (e.g., on load) or after any render
  useEffect(() => {
    if (gridRef.current) {
      const cells = gridRef.current.querySelectorAll('td[data-row][data-col]');
      cells.forEach(td => {
        const r = parseInt(td.getAttribute('data-row') || '0');
        const c = parseInt(td.getAttribute('data-col') || '0');
        if (r < grid.length && c < grid[0].length) {
          const cell = grid[r][c];
          
          if (skipHtmlUpdateForCell.current && skipHtmlUpdateForCell.current.row === r && skipHtmlUpdateForCell.current.col === c) {
            return;
          }

          // DO NOT overwrite if this cell is currently focused by the user
          if (document.activeElement === td) {
            return;
          }

          if (td.innerHTML !== cell.text) {
            td.innerHTML = cell.text;
          }
        }
      });
      skipHtmlUpdateForCell.current = null;
    }
  });

  const handleAddTable = () => {
    const syncedGrid = syncDomToGrid();
    const html = generateTableHtml(syncedGrid);
    if (!html) return;
    onAddTable(html);
    resetGrid();
  };

  const handleUpdateTableClick = () => {
    const syncedGrid = syncDomToGrid();
    const html = generateTableHtml(syncedGrid);
    if (!html) return;
    if (onUpdateTable) onUpdateTable(html);
    resetGrid();
  };

  // Insert bullet (unordered list item) into active cell with custom style
  const insertBullet = (bulletStyle: 'disc' | 'circle' | 'square' | 'arrow' = 'disc') => {
    if (!activeCell) return;
    const td = gridRef.current?.querySelector(`td[data-row="${activeCell.row}"][data-col="${activeCell.col}"]`) as HTMLElement;
    if (!td) return;
    
    const selection = window.getSelection();
    const hasSelectionInCell = selection && selection.rangeCount > 0 && td.contains(selection.getRangeAt(0).commonAncestorContainer);

    const bulletMap: Record<string, string> = {
      disc: 'disc',
      circle: 'circle',
      square: 'square',
      arrow: 'none'
    };
    const listStyle = bulletMap[bulletStyle];
    const bulletPrefix = bulletStyle === 'arrow' ? '→ ' : '';

    if (hasSelectionInCell) {
      document.execCommand('insertUnorderedList', false);
      
      const range = selection.getRangeAt(0);
      let node = range.commonAncestorContainer as HTMLElement;
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentElement as HTMLElement;
      }
      const closestUl = node.closest('ul');
      if (closestUl) {
        closestUl.style.listStyle = listStyle;
        closestUl.style.margin = '0';
        closestUl.style.paddingLeft = '18px';
        
        if (bulletStyle === 'arrow') {
           const lis = closestUl.querySelectorAll('li');
           lis.forEach(li => {
             if (!li.innerText.startsWith('→')) {
               li.innerHTML = '→ ' + li.innerHTML;
             }
           });
        }
      } else {
        const uls = td.querySelectorAll('ul');
        uls.forEach(ul => {
          ul.style.listStyle = listStyle;
          ul.style.margin = '0';
          ul.style.paddingLeft = '18px';
        });
      }
      handleCellInput(activeCell.row, activeCell.col, td.innerHTML);
      return;
    }

    const currentHtml = td.innerHTML;
    if (currentHtml.includes('<ul')) {
      const newLi = `<li style="${bulletStyle === 'arrow' ? 'list-style:none;' : ''}">${bulletPrefix}Item</li>`;
      td.innerHTML = currentHtml.replace('</ul>', newLi + '</ul>');
    } else {
      const existing = td.innerText || '';
      const liStyle = bulletStyle === 'arrow' ? '' : `list-style:${listStyle};`;
      td.innerHTML = `<ul style="margin:0;padding-left:18px;${liStyle}"><li>${bulletPrefix}${existing || 'Item'}</li></ul>`;
    }
    handleCellInput(activeCell.row, activeCell.col, td.innerHTML);
  };

  const openFullscreen = () => {
    const ch = channelId || `excel-${lang || 'en'}-${Date.now()}`;
    window.open(`/admin/excel-fullscreen?lang=${lang || 'en'}&channel=${ch}`, '_blank');
  };

  const activeCellData = activeCell ? grid[activeCell.row][activeCell.col] : null;

  const [selectionRect, setSelectionRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);

  const updateSelectionRect = useCallback(() => {
    if (selectedCells.length === 0 || !gridRef.current) {
      setSelectionRect(null);
      return;
    }
    
    let minTop = Infinity;
    let minLeft = Infinity;
    let maxBottom = -Infinity;
    let maxRight = -Infinity;
    
    let found = false;

    selectedCells.forEach(({ row, col }) => {
      const td = gridRef.current?.querySelector(`td[data-row="${row}"][data-col="${col}"]`) as HTMLElement;
      if (td) {
        found = true;
        const top = td.offsetTop;
        const left = td.offsetLeft;
        const bottom = top + td.offsetHeight;
        const right = left + td.offsetWidth;
        
        if (top < minTop) minTop = top;
        if (left < minLeft) minLeft = left;
        if (bottom > maxBottom) maxBottom = bottom;
        if (right > maxRight) maxRight = right;
      }
    });

    if (found) {
      setSelectionRect({
        top: minTop,
        left: minLeft,
        width: maxRight - minLeft,
        height: maxBottom - minTop,
      });
    } else {
      setSelectionRect(null);
    }
  }, [selectedCells]);

  useEffect(() => {
    updateSelectionRect();
  }, [updateSelectionRect, grid, colWidths, rowHeights]);

  return (
    <div>
      {/* Ribbon */}
      <div className="bg-muted border-b border-border flex flex-wrap p-1.5 gap-2.5 mb-2">
        {/* Fullscreen */}
        <div className="border-r border-border pr-2.5 flex flex-col items-center">
          <div className="flex gap-1 items-center h-10">
            <button onClick={openFullscreen} className="px-2 cursor-pointer border border-primary bg-primary/10 text-sm hover:bg-primary/20 rounded font-bold" title="Open in Full Screen (New Tab)">⛶ Full Screen</button>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase">View</span>
        </div>

        {/* History */}
        <div className="border-r border-border pr-2.5 flex flex-col items-center">
          <div className="flex gap-1 items-center h-10">
            <button onClick={handleUndo} disabled={historyState.index <= 0} className="px-1 cursor-pointer border border-transparent bg-transparent text-sm hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed" title="Undo (Ctrl+Z)">↩️ Undo</button>
            <button onClick={handleRedo} disabled={historyState.index >= historyState.history.length - 1} className="px-1 cursor-pointer border border-transparent bg-transparent text-sm hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed" title="Redo (Ctrl+Y)">↪️ Redo</button>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase">History</span>
        </div>

        {/* Clipboard */}
        <div className="border-r border-border pr-2.5 flex flex-col items-center">
          <div className="flex gap-1 items-center h-10">
            <button onClick={execCopy} className="px-1 cursor-pointer border border-transparent bg-transparent text-sm hover:bg-border">📋 Copy</button>
            <button onClick={execCut} className="px-1 cursor-pointer border border-transparent bg-transparent text-sm hover:bg-border">✂️ Cut</button>
            <button onClick={pasteData} className="px-1 cursor-pointer border border-transparent bg-transparent text-sm hover:bg-border">📋 Paste</button>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase">Clipboard</span>
        </div>

        {/* Font */}
        <div className="border-r border-border pr-2.5 flex flex-col items-center">
          <div className="flex gap-1 items-center h-10 flex-wrap">
            <select value={currentFont} onChange={e => { setCurrentFont(e.target.value); if (!applyRichTextFormat('fontNameCustom', e.target.value)) applyToSelection('fontFamily', e.target.value); }} className="px-1 text-sm border border-border bg-background">
              <option value="Arial">Arial</option>
              <option value="Calibri">Calibri</option>
              <option value="Verdana">Verdana</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Georgia">Georgia</option>
            </select>
            <input 
              type="number" 
              value={currentFontSize} 
              onChange={e => {
                const newVal = e.target.value;
                setCurrentFontSize(newVal);
                if (newVal && !isNaN(parseInt(newVal))) {
                  const sizePx = newVal + 'px';
                  if (!applyRichTextFormat('fontSizePx', sizePx)) {
                    applyToSelection('fontSize', sizePx);
                  }
                }
              }} 
              onBlur={() => { 
                if (currentFontSize) {
                  const sizePx = currentFontSize + 'px';
                  if (!applyRichTextFormat('fontSizePx', sizePx)) {
                    applyToSelection('fontSize', sizePx);
                  }
                }
              }} 
              onKeyDown={e => { 
                if (e.key === 'Enter') { 
                  if (currentFontSize) {
                    const sizePx = currentFontSize + 'px';
                    if (!applyRichTextFormat('fontSizePx', sizePx)) {
                      applyToSelection('fontSize', sizePx);
                    }
                  }
                } 
              }} 
              className="w-11 px-1 text-sm border border-border bg-background" 
            />
            <button onMouseDown={e => e.preventDefault()} onClick={() => { const newSize = (parseInt(currentFontSize) || 18) + 1; setCurrentFontSize(newSize.toString()); if (!applyRichTextFormat('fontSizePx', newSize + 'px')) applyToSelection('fontSize', newSize + 'px'); }} className="px-1.5 cursor-pointer border border-transparent bg-transparent hover:bg-border text-sm font-bold" title="Increase Font Size">A&#8593;</button>
            <button onMouseDown={e => e.preventDefault()} onClick={() => { const newSize = Math.max(1, (parseInt(currentFontSize) || 18) - 1); setCurrentFontSize(newSize.toString()); if (!applyRichTextFormat('fontSizePx', newSize + 'px')) applyToSelection('fontSize', newSize + 'px'); }} className="px-1.5 cursor-pointer border border-transparent bg-transparent hover:bg-border text-xs font-bold" title="Decrease Font Size">A&#8595;</button>
            <button onMouseDown={e => e.preventDefault()} onClick={() => { if (!applyRichTextFormat('bold')) applyToSelection('fontWeight', 'bold'); }} className={`px-2 cursor-pointer border border-transparent font-bold hover:bg-border ${activeFormats.bold || activeCellData?.fontWeight === 'bold' ? 'bg-border shadow-inner' : 'bg-transparent'}`}>B</button>
            <button onMouseDown={e => e.preventDefault()} onClick={() => { if (!applyRichTextFormat('italic')) applyToSelection('fontStyle', 'italic'); }} className={`px-2 cursor-pointer border border-transparent italic hover:bg-border ${activeFormats.italic || activeCellData?.fontStyle === 'italic' ? 'bg-border shadow-inner' : 'bg-transparent'}`}>I</button>
            <button onMouseDown={e => e.preventDefault()} onClick={() => { if (!applyRichTextFormat('underline')) applyToSelection('textDecoration', 'underline'); }} className={`px-2 cursor-pointer border border-transparent underline hover:bg-border ${activeFormats.underline || activeCellData?.textDecoration === 'underline' ? 'bg-border shadow-inner' : 'bg-transparent'}`}>U</button>
            <button onMouseDown={e => e.preventDefault()} onClick={() => { 
              if (!applyRichTextFormat('removeFormat')) { 
                // Clear cell-level formatting
                applyToSelection('fontWeight', 'normal'); 
                applyToSelection('fontStyle', 'normal'); 
                applyToSelection('textDecoration', 'none'); 
                applyToSelection('color', '#000000'); 
                applyToSelection('backgroundColor', 'transparent'); 
                applyToSelection('fontSize', '18px'); 
                applyToSelection('fontFamily', 'Arial'); 
                
                // Clear inline formatting for all selected cells
                selectedCells.forEach(({ row, col }) => {
                  const td = gridRef.current?.querySelector(`td[data-row="${row}"][data-col="${col}"]`) as HTMLElement;
                  if (td) {
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.selectNodeContents(td);
                    selection?.removeAllRanges();
                    selection?.addRange(range);
                    document.execCommand('removeFormat', false, '');
                    updateCell(row, col, { text: td.innerHTML });
                  }
                });
                window.getSelection()?.removeAllRanges();
              } 
            }} className="px-2 cursor-pointer border border-transparent bg-transparent hover:bg-border" title="Clear Formatting">🆑</button>
            <div className="flex items-center gap-0.5">
              <label className="text-[10px]">A</label>
              <input type="color" value={cssColorToHex(activeCellData?.color || '#000000')} onChange={e => { if (!applyRichTextFormat('foreColor', e.target.value)) applyToSelection('color', e.target.value); }} className="w-6 h-6 cursor-pointer" title="Text Color" />
            </div>
            <div className="flex items-center gap-0.5">
              <label className="text-[10px]">🎨</label>
              <input type="color" value={cssColorToHex(activeCellData?.backgroundColor === 'transparent' || !activeCellData?.backgroundColor ? '#ffffff' : activeCellData.backgroundColor)} onChange={e => { if (!applyRichTextFormat('hiliteColor', e.target.value)) applyToSelection('backgroundColor', e.target.value); }} className="w-6 h-6 cursor-pointer" title="Fill Color" />
            </div>
            <div className="flex items-center gap-0.5">
              <input type="text" value={textColorHex} onChange={e => setTextColorHex(e.target.value)} placeholder="#hex" className="w-16 px-1 text-xs border border-border bg-background rounded" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const val = textColorHex.trim(); if (val) { const color = /^[0-9A-Fa-f]{3,6}$/.test(val) ? `#${val}` : val; if (!applyRichTextFormat('foreColor', color)) applyToSelection('color', color); } } }} title="Text Color Code" />
              <label className="text-[10px]">Text</label>
            </div>
            <div className="flex items-center gap-0.5">
              <input type="text" value={bgColorHex} onChange={e => setBgColorHex(e.target.value)} placeholder="#hex" className="w-16 px-1 text-xs border border-border bg-background rounded" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const val = bgColorHex.trim(); if (val) { const color = /^[0-9A-Fa-f]{3,6}$/.test(val) ? `#${val}` : val; if (!applyRichTextFormat('hiliteColor', color)) applyToSelection('backgroundColor', color); } } }} title="Fill Color Code" />
              <label className="text-[10px]">Fill</label>
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase">Font</span>
        </div>

        {/* Alignment */}
        <div className="border-r border-border pr-2.5 flex flex-col items-center">
          <div className="flex gap-1 items-center h-10">
            <button onMouseDown={e => e.preventDefault()} onClick={() => { applyRichTextFormat('justifyLeft'); applyToSelection('textAlign', 'left'); }} className={`px-2 cursor-pointer border border-transparent hover:bg-border ${activeCellData?.textAlign === 'left' ? 'bg-border shadow-inner' : 'bg-transparent'}`} title="Align Left">⬅ L</button>
            <button onMouseDown={e => e.preventDefault()} onClick={() => { applyRichTextFormat('justifyCenter'); applyToSelection('textAlign', 'center'); }} className={`px-2 cursor-pointer border border-transparent hover:bg-border ${activeCellData?.textAlign === 'center' ? 'bg-border shadow-inner' : 'bg-transparent'}`} title="Align Center">⬌ C</button>
            <button onMouseDown={e => e.preventDefault()} onClick={() => { applyRichTextFormat('justifyRight'); applyToSelection('textAlign', 'right'); }} className={`px-2 cursor-pointer border border-transparent hover:bg-border ${activeCellData?.textAlign === 'right' ? 'bg-border shadow-inner' : 'bg-transparent'}`} title="Align Right">➡ R</button>
            <span className="border-l border-border mx-1 h-6"></span>
            <button onMouseDown={e => e.preventDefault()} onClick={() => applyToSelection('verticalAlign', 'top')} className={`px-2 cursor-pointer border border-transparent hover:bg-border ${activeCellData?.verticalAlign === 'top' ? 'bg-border shadow-inner' : 'bg-transparent'}`} title="Align Top">⬆ T</button>
            <button onMouseDown={e => e.preventDefault()} onClick={() => applyToSelection('verticalAlign', 'middle')} className={`px-2 cursor-pointer border border-transparent hover:bg-border ${activeCellData?.verticalAlign === 'middle' || !activeCellData?.verticalAlign ? 'bg-border shadow-inner' : 'bg-transparent'}`} title="Align Middle">⬍ M</button>
            <button onMouseDown={e => e.preventDefault()} onClick={() => applyToSelection('verticalAlign', 'bottom')} className={`px-2 cursor-pointer border border-transparent hover:bg-border ${activeCellData?.verticalAlign === 'bottom' ? 'bg-border shadow-inner' : 'bg-transparent'}`} title="Align Bottom">⬇ B</button>
            <button onMouseDown={e => e.preventDefault()} onClick={mergeCells} className="px-2 cursor-pointer bg-primary/10 font-bold border border-primary text-sm hover:bg-primary/20 rounded">🔗 Merge</button>
            <button onMouseDown={e => e.preventDefault()} onClick={unmergeCells} className="px-2 cursor-pointer bg-destructive/10 font-bold border border-destructive text-sm hover:bg-destructive/20 rounded">🔓 Unmerge</button>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase">Alignment</span>
        </div>

        {/* Borders */}
        <div className="border-r border-border pr-2.5 flex flex-col items-center">
          <div className="flex gap-1 items-center h-10">
            <button onMouseDown={e => e.preventDefault()} onClick={() => applyBorder('all')} className="px-1 cursor-pointer border border-transparent bg-transparent text-sm hover:bg-border">⬛ All</button>
            <button onMouseDown={e => e.preventDefault()} onClick={() => applyBorder('outside')} className="px-1 cursor-pointer border border-transparent bg-transparent text-sm hover:bg-border">▢ Outside</button>
            <button onMouseDown={e => e.preventDefault()} onClick={() => applyBorder('none')} className="px-1 cursor-pointer border border-transparent bg-transparent text-sm hover:bg-border">❌ No</button>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase">Borders</span>
        </div>

        {/* Insert (Link + Bullet) */}
        <div className="border-r border-border pr-2.5 flex flex-col items-center">
          <div className="flex gap-1 items-center h-10">
            <button onMouseDown={e => {
              e.preventDefault();
              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0 && activeCell) {
                 const td = gridRef.current?.querySelector(`td[data-row="${activeCell.row}"][data-col="${activeCell.col}"]`) as HTMLElement;
                 if (td && td.contains(sel.getRangeAt(0).commonAncestorContainer)) {
                    savedSelectionRange.current = sel.getRangeAt(0).cloneRange();
                 }
              }
            }} onClick={() => {
              if (!activeCell) return;
              
              const range = savedSelectionRange.current;
              const hasSelection = range && !range.collapsed;
              const url = prompt('Enter URL for selected text:');
              if (!url) return;

              if (hasSelection) {
                applyRichTextFormat('createLink', url);
                return;
              }
              
              const cell = grid[activeCell.row][activeCell.col];
              // Fallback for collapsed selection or no selection
              const textToShow = prompt('Enter text to display (or leave empty to show URL):') || url;
              const linkHtml = `<a href="${url}" target="_blank" style="color:${cell.color || 'inherit'};text-decoration:underline;">${textToShow}</a>`;
              
              const td = gridRef.current?.querySelector(`td[data-row="${activeCell.row}"][data-col="${activeCell.col}"]`) as HTMLElement;
              if (td) {
                td.focus();
                if (range) {
                  const sel = window.getSelection();
                  if (sel) {
                    sel.removeAllRanges();
                    sel.addRange(range);
                  }
                }
                document.execCommand('insertHTML', false, linkHtml);
                skipHtmlUpdateForCell.current = { row: activeCell.row, col: activeCell.col };
                updateCell(activeCell.row, activeCell.col, { text: td.innerHTML });
                setFormulaValue(td.innerText);
              } else {
                updateCell(activeCell.row, activeCell.col, { text: linkHtml });
              }
            }} className="px-2 cursor-pointer border border-transparent bg-transparent text-sm hover:bg-border">🔗 Link</button>
            <div className="relative group">
              <button onMouseDown={e => e.preventDefault()} className="px-2 cursor-pointer border border-transparent bg-transparent text-sm hover:bg-border" title="Add bullet list item">• List ▼</button>
              <div className="absolute left-0 top-full pt-1 bg-background border border-border rounded shadow-lg hidden group-hover:block z-50 before:content-[''] before:absolute before:top-[-8px] before:left-0 before:right-0 before:h-[8px]">
                <button onMouseDown={e => e.preventDefault()} onClick={() => insertBullet('disc')} className="block w-full text-left px-3 py-1 text-sm hover:bg-muted">• Disc</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => insertBullet('circle')} className="block w-full text-left px-3 py-1 text-sm hover:bg-muted">◦ Circle</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => insertBullet('square')} className="block w-full text-left px-3 py-1 text-sm hover:bg-muted">▪ Square</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => insertBullet('arrow')} className="block w-full text-left px-3 py-1 text-sm hover:bg-muted">→ Arrow</button>
              </div>
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase">Insert</span>
        </div>

        {/* Cells */}
        <div className="border-r border-border pr-2.5 flex flex-col items-center">
          <div className="flex gap-1 items-center h-10">
            <div className="relative group">
              <button onMouseDown={e => e.preventDefault()} className="px-2 cursor-pointer border border-transparent bg-transparent text-sm hover:bg-border font-bold text-green-700" title="Insert">➕ Insert ▼</button>
              <div className="absolute left-0 top-full pt-1 bg-background border border-border rounded shadow-lg hidden group-hover:block z-50 before:content-[''] before:absolute before:top-[-8px] before:left-0 before:right-0 before:h-[8px]">
                <button onMouseDown={e => e.preventDefault()} onClick={() => insertRow(true)} className="block w-full text-left px-3 py-1 text-sm hover:bg-muted">Row Above</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => insertRow(false)} className="block w-full text-left px-3 py-1 text-sm hover:bg-muted">Row Below</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => insertCol(true)} className="block w-full text-left px-3 py-1 text-sm hover:bg-muted">Column Left</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => insertCol(false)} className="block w-full text-left px-3 py-1 text-sm hover:bg-muted">Column Right</button>
              </div>
            </div>
            <div className="relative group">
              <button onMouseDown={e => e.preventDefault()} className="px-2 cursor-pointer border border-transparent bg-transparent text-sm hover:bg-border font-bold text-red-600" title="Delete">❌ Delete ▼</button>
              <div className="absolute left-0 top-full pt-1 bg-background border border-border rounded shadow-lg hidden group-hover:block z-50 before:content-[''] before:absolute before:top-[-8px] before:left-0 before:right-0 before:h-[8px]">
                <button onMouseDown={e => e.preventDefault()} onClick={deleteRow} className="block w-full text-left px-3 py-1 text-sm text-red-600 hover:bg-muted">Delete Row</button>
                <button onMouseDown={e => e.preventDefault()} onClick={deleteCol} className="block w-full text-left px-3 py-1 text-sm text-red-600 hover:bg-muted">Delete Column</button>
              </div>
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase">Cells</span>
        </div>

        {/* Editing */}
        <div className="flex flex-col items-center">
          <div className="flex gap-1 items-center h-10">
            <button onClick={autoSum} className="px-2 cursor-pointer border border-transparent bg-transparent text-primary font-bold hover:bg-border">Σ AutoSum</button>
            <button onClick={clearSelection} className="px-2 cursor-pointer border border-transparent bg-transparent hover:bg-border">Clear</button>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase">Editing</span>
        </div>
      </div>

      {/* Formula Bar */}
      <div className="flex items-center p-2 border-b border-border bg-background">
        <div className="w-16 text-center border-r border-border mr-2.5 font-bold text-primary text-base">
          {activeCell ? getCellId(activeCell.row, activeCell.col) : 'A1'}
        </div>
        <input
          type="text"
          value={formulaValue}
          onChange={e => handleFormulaChange(e.target.value)}
          placeholder="Formula bar..."
          className="flex-1 border-none outline-none text-base bg-transparent"
        />
      </div>

      {/* Grid */}
      <div className="h-[500px] overflow-auto bg-muted border border-border">
        <div 
          className="relative inline-block min-w-full"
          style={{ zoom: `${zoom}%` }}
          onTouchMove={handleTouchMove}
        >
          <table key={gridKey} ref={gridRef} className="border-collapse bg-background" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th 
                className="excel-header sticky top-0 left-0 z-10 bg-muted cursor-pointer hover:bg-slate-300" 
                style={{ width: 40 }}
                onClick={() => {
                  const cells: { row: number; col: number }[] = [];
                  for (let r = 0; r < TOTAL_ROWS; r++) {
                    for (let c = 0; c < TOTAL_COLS; c++) {
                      if (!grid[r][c].hidden) cells.push({ row: r, col: c });
                    }
                  }
                  setSelectedCells(cells);
                  setActiveCellState({ row: 0, col: 0 });
                  setStartCell({ row: 0, col: 0 });
                  setSelectedRowHeader(null);
                  setSelectedColHeader(null);
                }}
                title="Select All"
              >
                <div className="absolute bottom-0 right-0 w-0 h-0 border-r-[8px] border-b-[8px] border-r-transparent border-b-slate-400 m-0.5"></div>
              </th>
              {Array.from({ length: grid[0]?.length || TOTAL_COLS }, (_, c) => (
                <th 
                  key={c} 
                  className={`excel-header sticky top-0 z-[2] relative cursor-pointer ${selectedColHeader === c ? 'bg-slate-300' : activeCell?.col === c ? 'bg-slate-200' : ''}`} 
                  style={{ width: colWidths[c] }}
                  onClick={() => handleColHeaderClick(c)}
                >
                  {getColLetter(c)}
                  <div 
                    className={`absolute top-0 right-[-8px] w-[16px] h-full cursor-col-resize z-20 flex items-center justify-center opacity-0 hover:opacity-100 ${selectedColHeader === c ? 'opacity-100' : ''}`} 
                    onMouseDown={(e) => handleColResize(c, e)}
                    onTouchStart={(e) => handleColResize(c, e)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      const isSelectedCurrent = selectedCells.some(cell => cell.col === c);
                      let colsToAdjust = [c];
                      if (isSelectedCurrent && selectedCells.length > 1) {
                         const cols = new Set(selectedCells.map(cell => cell.col));
                         colsToAdjust = Array.from(cols);
                      }
                      autoAdjustCols(colsToAdjust);
                    }}
                  >
                    <div className="w-[2px] h-full bg-blue-500 mx-[1px]"></div>
                    <div className="w-[2px] h-full bg-blue-500 mx-[1px]"></div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, ri) => (
              <tr key={ri}>
                <td 
                  className={`excel-header sticky left-0 z-[3] text-center font-bold text-xs relative cursor-pointer ${selectedRowHeader === ri ? 'bg-slate-300' : activeCell?.row === ri ? 'bg-slate-200' : 'bg-muted'}`} 
                  style={{ width: 40, minHeight: rowHeights[ri], height: 'auto' }}
                  onClick={() => handleRowHeaderClick(ri)}
                >
                  {ri + 1}
                  <div 
                    className={`absolute bottom-[-8px] left-0 w-full h-[16px] cursor-row-resize z-20 flex flex-col items-center justify-center opacity-0 hover:opacity-100 ${selectedRowHeader === ri ? 'opacity-100' : ''}`} 
                    onMouseDown={(e) => handleRowResize(ri, e)}
                    onTouchStart={(e) => handleRowResize(ri, e)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      const isSelectedCurrent = selectedCells.some(cell => cell.row === ri);
                      let rowsToAdjust = [ri];
                      if (isSelectedCurrent && selectedCells.length > 1) {
                         const rows = new Set(selectedCells.map(cell => cell.row));
                         rowsToAdjust = Array.from(rows);
                      }
                      autoAdjustRows(rowsToAdjust);
                    }}
                  >
                    <div className="h-[2px] w-full bg-blue-500 my-[1px]"></div>
                    <div className="h-[2px] w-full bg-blue-500 my-[1px]"></div>
                  </div>
                </td>
                {row.map((cell, ci) => {
                  if (cell.hidden) return null;
                  return (
                    <td
                      key={ci}
                      data-row={ri}
                      data-col={ci}
                      className={`excel-cell ${isSelected(ri, ci) ? 'selected' : ''} ${isActive(ri, ci) ? 'active-cell' : ''}`}
                      style={{
                        fontFamily: cell.fontFamily,
                        fontSize: cell.fontSize,
                        fontWeight: cell.fontWeight,
                        fontStyle: cell.fontStyle,
                        textDecoration: cell.textDecoration,
                        textAlign: cell.textAlign as any,
                        verticalAlign: cell.verticalAlign as any,
                        color: cell.color,
                        backgroundColor: cell.backgroundColor,
                        border: cell.borderAll ? '1px solid hsl(var(--border))' : cell.borderOutside ? '1px solid hsl(var(--border))' : undefined,
                        minHeight: rowHeights[ri],
                        height: 'auto',
                        width: colWidths[ci],
                        whiteSpace: 'nowrap',
                        wordBreak: 'normal',
                      }}
                      colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                      rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                      contentEditable
                      suppressContentEditableWarning
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        const anchor = target.closest('a');
                        if (anchor) {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          const tdElement = e.currentTarget as HTMLElement;
                          const originalHtml = tdElement.innerHTML;
                          const currentHref = anchor.getAttribute('href') || (anchor as HTMLAnchorElement).href || '';
                          
                          setTimeout(() => {
                            const shouldVisit = window.confirm(`Current Link: ${currentHref}\n\nDo you want to OPEN this link in a new tab?\n(Click Cancel to edit the URL instead)`);
                            if (shouldVisit) {
                              window.open(currentHref, '_blank');
                              // Restore exact original HTML and save state to keep it bulletproof
                              tdElement.innerHTML = originalHtml;
                              updateCell(ri, ci, { text: originalHtml });
                            } else {
                              const newHref = prompt('Update Link URL (leave empty to remove link):', currentHref);
                              if (newHref !== null) {
                                const temp = document.createElement('div');
                                temp.innerHTML = originalHtml;
                                const tempAnchor = temp.querySelector('a');
                                if (tempAnchor) {
                                  if (newHref.trim() === '') {
                                    const childNodes = Array.from(tempAnchor.childNodes);
                                    childNodes.forEach(child => tempAnchor.parentNode?.insertBefore(child, tempAnchor));
                                    tempAnchor.parentNode?.removeChild(tempAnchor);
                                  } else {
                                    tempAnchor.setAttribute('href', newHref);
                                    if (!tempAnchor.getAttribute('target')) {
                                       tempAnchor.setAttribute('target', '_blank');
                                    }
                                  }
                                }
                                const finalHtml = temp.innerHTML;
                                tdElement.innerHTML = finalHtml;
                                updateCell(ri, ci, { text: finalHtml });
                              } else {
                                // Restore original HTML if cancelled
                                tdElement.innerHTML = originalHtml;
                                updateCell(ri, ci, { text: originalHtml });
                              }
                            }
                          }, 10);
                        }
                      }}
                      onMouseDown={() => handleMouseDown(ri, ci)}
                      onMouseOver={() => handleMouseOver(ri, ci)}
                      onTouchStart={(e) => handleTouchStart(e, ri, ci)}
                      onKeyDown={(e) => { handleKeyDownCell(e, ri, ci); updateSelectionRect(); }}
                      onInput={e => {
                        if (activeCell && activeCell.row === ri && activeCell.col === ci) {
                          setFormulaValue((e.target as HTMLElement).innerText);
                          updateSelectionRect();
                          
                          // Use autoAdjustCols so the width is correctly measured (ignoring word-wrap)
                          requestAnimationFrame(() => {
                            autoAdjustCols([ci]);
                            autoAdjustRows([ri]);
                          });
                        }
                      }}
                      onBlur={e => {
                        skipHtmlUpdateForCell.current = { row: ri, col: ci };
                        updateCell(ri, ci, { text: (e.target as HTMLElement).innerHTML });
                      }}
                      onPaste={e => {
                        const html = e.clipboardData.getData('text/html');
                        if (html && (html.includes('<table') || html.includes('<tr'))) {
                          e.preventDefault();
                          (e.target as HTMLElement).blur(); // Fix: prevent useEffect from skipping active cell
                          
                          // pre-process HTML to inline class-based CSS (from MS Excel/Word)
                          const tempDiv = document.createElement('div');
                          tempDiv.style.display = 'none';
                          tempDiv.innerHTML = html;
                          document.body.appendChild(tempDiv);
                          
                          tempDiv.querySelectorAll('style').forEach(styleBlock => {
                              const styleText = styleBlock.innerHTML || styleBlock.innerText;
                              const cssRegex = /([a-zA-Z0-9_\-.\s#,:]+)\s*\{([^}]+)\}/g;
                              let match;
                              while ((match = cssRegex.exec(styleText)) !== null) {
                                  const selectors = match[1].split(',').map(s => s.trim());
                                  const cssRulesText = match[2].trim();
                                  selectors.forEach(selector => {
                                      if (!selector || selector.includes(':') || selector.includes('@')) return;
                                      try {
                                          tempDiv.querySelectorAll(selector).forEach(node => {
                                              (node as HTMLElement).style.cssText += ';' + cssRulesText;
                                          });
                                      } catch (err) { /* ignore invalid selectors */ }
                                  });
                              }
                          });
                          const processedHtml = tempDiv.innerHTML;
                          document.body.removeChild(tempDiv);
                          
                          const pastedGrid = parseHtmlToGrid(processedHtml);
                          
                          let pMaxR = 0, pMaxC = 0;
                          for(let pr=0; pr<TOTAL_ROWS; pr++) {
                            for(let pc=0; pc<TOTAL_COLS; pc++) {
                               if(pastedGrid[pr][pc].text || pastedGrid[pr][pc].backgroundColor !== '#ffffff' || pastedGrid[pr][pc].colSpan > 1 || pastedGrid[pr][pc].rowSpan > 1) {
                                  pMaxR = Math.max(pMaxR, pr);
                                  pMaxC = Math.max(pMaxC, pc);
                               }
                            }
                          }
                          
                          updateGrid(g => {
                            const newGrid = g.map(rRow => [...rRow]);
                            for(let pr=0; pr<=pMaxR; pr++) {
                              for(let pc=0; pc<=pMaxC; pc++) {
                                const targetRow = ri + pr;
                                const targetCol = ci + pc;
                                if(targetRow < TOTAL_ROWS && targetCol < TOTAL_COLS) {
                                  newGrid[targetRow][targetCol] = { ...pastedGrid[pr][pc] };
                                }
                              }
                            }
                            return newGrid;
                          });

                          setTimeout(() => {
                             const colsToAdjust: number[] = [];
                             const rowsToAdjust: number[] = [];
                             for(let pr=0; pr<=pMaxR; pr++) {
                               for(let pc=0; pc<=pMaxC; pc++) {
                                  const targetRow = ri + pr;
                                  const targetCol = ci + pc;
                                  if(targetRow < TOTAL_ROWS && targetCol < TOTAL_COLS) {
                                     if (!colsToAdjust.includes(targetCol)) colsToAdjust.push(targetCol);
                                     if (!rowsToAdjust.includes(targetRow)) rowsToAdjust.push(targetRow);
                                  }
                               }
                             }
                             // Force manual update of td.innerHTML just in case React batches updates weirdly
                             if (gridRef.current) {
                               for(let pr=0; pr<=pMaxR; pr++) {
                                 for(let pc=0; pc<=pMaxC; pc++) {
                                   const targetRow = ri + pr;
                                   const targetCol = ci + pc;
                                   if(targetRow < TOTAL_ROWS && targetCol < TOTAL_COLS) {
                                      const td = gridRef.current.querySelector(`td[data-row="${targetRow}"][data-col="${targetCol}"]`) as HTMLElement;
                                      if (td) td.innerHTML = pastedGrid[pr][pc].text;
                                   }
                                 }
                               }
                             }
                             autoAdjustCols(colsToAdjust);
                             autoAdjustRows(rowsToAdjust);
                          }, 100);
                        } else if (html) {
                          e.preventDefault();
                          const tempDiv = document.createElement('div');
                          tempDiv.style.display = 'none';
                          tempDiv.innerHTML = html;
                          document.body.appendChild(tempDiv);
                          
                          tempDiv.querySelectorAll('style').forEach(styleBlock => {
                              const styleText = styleBlock.innerHTML || styleBlock.innerText;
                              const cssRegex = /([a-zA-Z0-9_\-.\s#,:]+)\s*\{([^}]+)\}/g;
                              let match;
                              while ((match = cssRegex.exec(styleText)) !== null) {
                                  const selectors = match[1].split(',').map(s => s.trim());
                                  const cssRulesText = match[2].trim();
                                  selectors.forEach(selector => {
                                      if (!selector || selector.includes(':') || selector.includes('@')) return;
                                      try {
                                          tempDiv.querySelectorAll(selector).forEach(node => {
                                              (node as HTMLElement).style.cssText += ';' + cssRulesText;
                                          });
                                      } catch (err) { /* ignore invalid selectors */ }
                                  });
                              }
                          });
                          
                          tempDiv.querySelectorAll('p').forEach(p => {
                             p.style.margin = '0';
                          });

                          document.execCommand('insertHTML', false, tempDiv.innerHTML);
                          document.body.removeChild(tempDiv);
                          
                          setTimeout(() => {
                            autoAdjustCols([ci]);
                            autoAdjustRows([ri]);
                          }, 50);
                        } else {
                           // Regular text paste
                           setTimeout(() => {
                             autoAdjustCols([ci]);
                             autoAdjustRows([ri]);
                           }, 50);
                        }
                      }}
                      {...((activeCell && activeCell.row === ri && activeCell.col === ci)
                        ? {}
                        : { dangerouslySetInnerHTML: { __html: cell.text } }
                      )}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

          {/* Selection Handles Overlay */}
          {selectionRect && (
            <div 
              className="absolute pointer-events-none z-20 border-2 border-primary"
              style={{
                top: selectionRect.top,
                left: selectionRect.left,
                width: selectionRect.width,
                height: selectionRect.height,
              }}
            >
              <div 
                className="absolute top-[-6px] left-[-6px] w-[10px] h-[10px] bg-primary border-2 border-white rounded-full cursor-nwse-resize pointer-events-auto"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setSelectionDragMode('top-left');
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setSelectionDragMode('top-left');
                }}
              />
              <div 
                className="absolute bottom-[-6px] right-[-6px] w-[10px] h-[10px] bg-primary border-2 border-white rounded-full cursor-nwse-resize pointer-events-auto"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setSelectionDragMode('bottom-right');
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setSelectionDragMode('bottom-right');
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Add Table Button & Zoom controls */}
      <div className="mt-4 flex gap-3 justify-between items-center">
        <div className="flex gap-3">
          {isEditing ? (
            <>
              <Button onClick={handleUpdateTableClick} className="font-bold bg-green-600 hover:bg-green-700 text-white">
                💾 Update Table
              </Button>
              <Button variant="outline" onClick={onCancelEdit}>
                Cancel Edit
              </Button>
            </>
          ) : (
            <Button onClick={handleAddTable} className="font-bold">
              ➕ Add Table
            </Button>
          )}
        </div>
        
        {/* Zoom controls */}
        <div className="flex items-center gap-2 border border-border rounded-md px-2 py-1 bg-muted">
          <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="px-2 hover:bg-background rounded" title="Zoom Out">➖</button>
          <input 
            type="number" 
            className="w-12 text-center bg-transparent outline-none text-sm font-medium" 
            value={zoom} 
            onChange={e => setZoom(Number(e.target.value))} 
            title="Type zoom percentage (e.g., 100)"
          />
          <span className="-ml-2 text-sm font-medium">%</span>
          <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="px-2 hover:bg-background rounded" title="Zoom In">➕</button>
        </div>
      </div>
    </div>
  );
};

export default ExcelEditor;
