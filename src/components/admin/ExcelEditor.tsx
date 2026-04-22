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
});

const TOTAL_ROWS = 50;
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
  const table = doc.querySelector('table');
  if (!table) return rows;

  const trs = table.querySelectorAll('tr');
  let r = 0;
  const occupied = Array(TOTAL_ROWS).fill(0).map(() => Array(TOTAL_COLS).fill(false));

  trs.forEach((tr) => {
    if (r >= TOTAL_ROWS) return;
    const tds = tr.querySelectorAll('td');
    let c = 0;

    tds.forEach((td) => {
      while (c < TOTAL_COLS && occupied[r][c]) {
        c++;
      }
      if (c >= TOTAL_COLS) return;

      const cell = rows[r][c];
      cell.text = td.innerHTML;
      
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

      const style = td.getAttribute('style') || '';
      const styleObj: Record<string, string> = {};
      style.split(';').forEach(s => {
        const colonIdx = s.indexOf(':');
        if (colonIdx > -1) {
          const key = s.substring(0, colonIdx).trim();
          const val = s.substring(colonIdx + 1).trim();
          if (key && val) styleObj[key] = val;
        }
      });

      if (styleObj['color']) {
        const c = styleObj['color'].replace(/\s/g, '').toLowerCase();
        if (c === '#0b3d91' || c === 'rgb(11,61,145)') {
          cell.color = 'inherit';
        } else {
          cell.color = styleObj['color'];
        }
      } else {
        cell.color = 'inherit';
      }

      if (styleObj['background-color']) cell.backgroundColor = styleObj['background-color'];
      if (styleObj['font-weight']) cell.fontWeight = styleObj['font-weight'];
      if (styleObj['font-style']) cell.fontStyle = styleObj['font-style'];
      if (styleObj['text-decoration']) cell.textDecoration = styleObj['text-decoration'];
      if (styleObj['text-align']) cell.textAlign = styleObj['text-align'];
      if (styleObj['vertical-align']) cell.verticalAlign = styleObj['vertical-align'];
      
      if (styleObj['font-family']) {
        const ff = styleObj['font-family'].replace(/['"]/g, '').toLowerCase();
        if (ff.includes('arial') || ff.includes('tahoma') || ff.includes('inherit')) {
          cell.fontFamily = 'inherit';
        } else {
          cell.fontFamily = styleObj['font-family'];
        }
      } else {
        cell.fontFamily = 'inherit';
      }
      
      if (styleObj['font-size']) cell.fontSize = styleObj['font-size'];
      
      if (styleObj['border']) {
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

const rgbToHex = (color: string) => {
  if (!color) return '#000000';
  if (color.startsWith('#')) return color;
  const rgb = color.match(/\d+/g);
  if (!rgb || rgb.length < 3) return '#000000';
  return '#' + rgb.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
};

const ExcelEditor = ({ onAddTable, onUpdateTable, onCancelEdit, initialHtml, isEditing, lang, channelId }: ExcelEditorProps) => {
  const [grid, setGrid] = useState<CellData[][]>(() => createEmptyGrid());

  const [selectedCells, setSelectedCells] = useState<{ row: number; col: number }[]>([]);
  const [activeCell, setActiveCellState] = useState<{ row: number; col: number } | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [selectionDragMode, setSelectionDragMode] = useState<'none' | 'top-left' | 'bottom-right'>('none');
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

    // Only apply rich text format if there is a text selection inside the cell
    // Otherwise, return false to let applyToSelection handle the whole cell
    if (range && !range.collapsed) {
      if (activeElem !== td) {
        td.focus({ preventScroll: true });
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
      
      try {
        document.execCommand('styleWithCSS', false, 'true');
      } catch (e) {
        // Ignore error if not supported
      }

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
         
         const fonts = td.querySelectorAll('font[size="7"]');
         fonts.forEach(f => {
           f.removeAttribute('size');
           f.style.fontSize = value || '18px';
         });
         
         // Fallback for browsers that create spans instead of fonts even with styleWithCSS=false
         const spans = td.querySelectorAll('span');
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
      
      // Update cell content
      updateCell(activeCell.row, activeCell.col, { text: td.innerHTML });
      if (activeCell) {
        setFormulaValue(td.innerText);
      }
      return true;
    }
    return false;
  };

  const pasteData = () => {
    if (!activeCell || !clipboardRange) return;
    updateGrid(g => {
      const newGrid = g.map(r => [...r]);
      for (let r = 0; r < clipboardRange.rows; r++) {
        for (let c = 0; c < clipboardRange.cols; c++) {
          const targetRow = activeCell.row + r;
          const targetCol = activeCell.col + c;
          if (targetRow < TOTAL_ROWS && targetCol < TOTAL_COLS) {
            const src = clipboardRange.data[r][c];
            newGrid[targetRow][targetCol] = { ...newGrid[targetRow][targetCol], text: src.text };
          }
        }
      }
      return newGrid;
    });
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
      while (nextRow >= 0 && grid[nextRow][col].hidden) nextRow--;
      if (nextRow >= 0) {
        e.preventDefault();
        focusDOMCell(nextRow, col);
      }
    } else if (e.key === 'ArrowDown') {
      let nextRow = row + 1;
      while (nextRow < TOTAL_ROWS && grid[nextRow][col].hidden) nextRow++;
      if (nextRow < TOTAL_ROWS) {
        e.preventDefault();
        focusDOMCell(nextRow, col);
      }
    } else if (e.key === 'ArrowLeft') {
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
        
        // Select all text in the cell, mirroring Excel behavior where a focused cell has its content selected
        // unless they explicitly double-click.
        const selection = window.getSelection();
        const range = document.createRange();
        if (td.childNodes.length > 0) {
          range.selectNodeContents(td);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
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

  // Column resize
  const handleColResize = (colIndex: number, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startWidth = colWidths[colIndex];
    let newWidth = startWidth;
    
    const thElement = gridRef.current?.querySelector(`th:nth-child(${colIndex + 2})`) as HTMLElement;

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
      const diff = currentX - startX;
      newWidth = Math.max(30, startWidth + diff);
      if (thElement) {
        thElement.style.width = `${newWidth}px`;
      }
    };
    const onUp = () => { 
      window.removeEventListener('mousemove', onMove as any); 
      window.removeEventListener('mouseup', onUp); 
      window.removeEventListener('touchmove', onMove as any); 
      window.removeEventListener('touchend', onUp); 
      setColWidths(prev => { const next = [...prev]; next[colIndex] = newWidth; return next; });
    };
    window.addEventListener('mousemove', onMove as any);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove as any, { passive: false });
    window.addEventListener('touchend', onUp);
  };

  // Row resize
  const handleRowResize = (rowIndex: number, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startHeight = rowHeights[rowIndex];
    let newHeight = startHeight;
    
    // The row header cell is at col 0 essentially, but we can set the height of the row header td itself
    const tdElement = gridRef.current?.querySelector(`tr:nth-child(${rowIndex + 1}) > td:first-child`) as HTMLElement;

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const currentY = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;
      const diff = currentY - startY;
      newHeight = Math.max(15, startHeight + diff);
      if (tdElement) {
        tdElement.style.height = `${newHeight}px`;
      }
    };
    const onUp = () => { 
      window.removeEventListener('mousemove', onMove as any); 
      window.removeEventListener('mouseup', onUp); 
      window.removeEventListener('touchmove', onMove as any); 
      window.removeEventListener('touchend', onUp); 
      setRowHeights(prev => { const next = [...prev]; next[rowIndex] = newHeight; return next; });
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
          const html = (td as HTMLElement).innerHTML || '';
          // Always use innerHTML to preserve all rich text formatting (colors, bold, links, lists, etc.)
          newGrid[r][c].text = html;
        }
      });
    }
    return newGrid;
  };

  const generateTableHtml = (sourceGrid: CellData[][]): string => {
    let maxRow = 0, maxCol = 0;
    sourceGrid.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        if (cell.text || cell.backgroundColor !== '#ffffff' || cell.hidden || cell.colSpan > 1 || cell.rowSpan > 1) {
          maxRow = Math.max(maxRow, ri);
          maxCol = Math.max(maxCol, ci);
        }
      });
    });

    if (maxRow === 0 && maxCol === 0 && !sourceGrid[0][0].text) return '';

    let html = '<table class="data-table" style="width:100%;border-collapse:collapse;margin-top:15px;">\n';
    for (let r = 0; r <= maxRow; r++) {
      html += '  <tr>\n';
      for (let c = 0; c <= maxCol; c++) {
        const cell = sourceGrid[r][c];
        if (cell.hidden) continue;

        let style = '';
        if (cell.color && cell.color !== 'inherit') style += `color:${cell.color};`;
        if (cell.backgroundColor && cell.backgroundColor !== '#ffffff' && cell.backgroundColor !== 'transparent') style += `background-color:${cell.backgroundColor};`;
        if (cell.fontWeight === 'bold') style += 'font-weight:bold;';
        if (cell.fontStyle === 'italic') style += 'font-style:italic;';
        if (cell.textDecoration === 'underline') style += 'text-decoration:underline;';
        if (cell.textAlign && cell.textAlign !== 'left') style += `text-align:${cell.textAlign};`;
        if (cell.verticalAlign && cell.verticalAlign !== 'middle') style += `vertical-align:${cell.verticalAlign};`;
        if (cell.fontFamily && cell.fontFamily !== 'inherit') style += `font-family:${cell.fontFamily};`;
        if (cell.fontSize && cell.fontSize !== '19px' && cell.fontSize !== '18px') style += `font-size:${cell.fontSize};`;
        
        if (cell.borderAll) {
          style += 'border:1px solid currentColor;';
        } else if (cell.borderOutside) {
          style += 'border:1px solid currentColor;';
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
        html += `    <td ${attrs}>${cellContent}</td>\n`;
      }
      html += '  </tr>\n';
    }
    html += '</table>';
    return html;
  };

  const [gridKey, setGridKey] = useState(0);

  useEffect(() => {
    if (isEditing && initialHtml) {
      setGrid(parseHtmlToGrid(initialHtml));
      setGridKey(prev => prev + 1);
    } else if (!isEditing) {
      resetGrid();
    }
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
            <input type="number" value={currentFontSize} onChange={e => setCurrentFontSize(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { if (!applyRichTextFormat('fontSizePx', currentFontSize + 'px')) applyToSelection('fontSize', currentFontSize + 'px'); } }} className="w-11 px-1 text-sm border border-border bg-background" />
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
              <input type="color" value={rgbToHex(activeCellData?.color || '#000000')} onChange={e => { if (!applyRichTextFormat('foreColor', e.target.value)) applyToSelection('color', e.target.value); }} className="w-6 h-6 cursor-pointer" title="Text Color" />
            </div>
            <div className="flex items-center gap-0.5">
              <label className="text-[10px]">🎨</label>
              <input type="color" value={rgbToHex(activeCellData?.backgroundColor === 'transparent' || !activeCellData?.backgroundColor ? '#ffffff' : activeCellData.backgroundColor)} onChange={e => { if (!applyRichTextFormat('hiliteColor', e.target.value)) applyToSelection('backgroundColor', e.target.value); }} className="w-6 h-6 cursor-pointer" title="Fill Color" />
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
            <button onMouseDown={e => e.preventDefault()} onClick={() => { if (!applyRichTextFormat('justifyLeft')) applyToSelection('textAlign', 'left'); }} className={`px-2 cursor-pointer border border-transparent hover:bg-border ${activeFormats.justifyLeft || activeCellData?.textAlign === 'left' ? 'bg-border shadow-inner' : 'bg-transparent'}`} title="Align Left">⬅ L</button>
            <button onMouseDown={e => e.preventDefault()} onClick={() => { if (!applyRichTextFormat('justifyCenter')) applyToSelection('textAlign', 'center'); }} className={`px-2 cursor-pointer border border-transparent hover:bg-border ${activeFormats.justifyCenter || activeCellData?.textAlign === 'center' ? 'bg-border shadow-inner' : 'bg-transparent'}`} title="Align Center">⬌ C</button>
            <button onMouseDown={e => e.preventDefault()} onClick={() => { if (!applyRichTextFormat('justifyRight')) applyToSelection('textAlign', 'right'); }} className={`px-2 cursor-pointer border border-transparent hover:bg-border ${activeFormats.justifyRight || activeCellData?.textAlign === 'right' ? 'bg-border shadow-inner' : 'bg-transparent'}`} title="Align Right">➡ R</button>
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
            <button onMouseDown={e => e.preventDefault()} onClick={() => {
              if (!activeCell) return;
              const url = prompt('Enter URL for selected text:');
              if (url) {
                if (applyRichTextFormat('createLink', url)) return;
                
                const cell = grid[activeCell.row][activeCell.col];
                const linkHtml = `<a href="${url}" target="_blank" style="color:${cell.color};text-decoration:underline;">${cell.text || url}</a>`;
                updateCell(activeCell.row, activeCell.col, { text: linkHtml });
                // Also update DOM
                const td = gridRef.current?.querySelector(`td[data-row="${activeCell.row}"][data-col="${activeCell.col}"]`) as HTMLElement;
                if (td) td.innerHTML = linkHtml;
              }
            }} className="px-2 cursor-pointer border border-transparent bg-transparent text-sm hover:bg-border">🔗 Link</button>
            <div className="relative group">
              <button onMouseDown={e => e.preventDefault()} className="px-2 cursor-pointer border border-transparent bg-transparent text-sm hover:bg-border" title="Add bullet list item">• List ▼</button>
              <div className="absolute left-0 top-full mt-0.5 bg-background border border-border rounded shadow-lg hidden group-hover:block z-50">
                <button onMouseDown={e => e.preventDefault()} onClick={() => insertBullet('disc')} className="block w-full text-left px-3 py-1 text-sm hover:bg-muted">• Disc</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => insertBullet('circle')} className="block w-full text-left px-3 py-1 text-sm hover:bg-muted">◦ Circle</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => insertBullet('square')} className="block w-full text-left px-3 py-1 text-sm hover:bg-muted">▪ Square</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => insertBullet('arrow')} className="block w-full text-left px-3 py-1 text-sm hover:bg-muted">→ Arrow</button>
              </div>
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase">Insert</span>
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
          onTouchMove={handleTouchMove}
        >
          <table key={gridKey} ref={gridRef} className="border-collapse bg-background" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th className="excel-header sticky top-0 left-0 z-10 bg-muted" style={{ width: 40 }}></th>
              {Array.from({ length: grid[0]?.length || TOTAL_COLS }, (_, c) => (
                <th 
                  key={c} 
                  className={`excel-header sticky top-0 z-[2] relative cursor-pointer ${selectedColHeader === c ? 'bg-slate-300' : activeCell?.col === c ? 'bg-slate-200' : ''}`} 
                  style={{ width: colWidths[c] }}
                  onClick={() => handleColHeaderClick(c)}
                >
                  {getColLetter(c)}
                  <div 
                    className={`absolute top-0 right-[-4px] w-[8px] h-full cursor-col-resize z-20 flex items-center justify-center opacity-0 hover:opacity-100 ${selectedColHeader === c ? 'opacity-100' : ''}`} 
                    onMouseDown={(e) => handleColResize(c, e)}
                    onTouchStart={(e) => handleColResize(c, e)}
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
                    className={`absolute bottom-[-4px] left-0 w-full h-[8px] cursor-row-resize z-20 flex flex-col items-center justify-center opacity-0 hover:opacity-100 ${selectedRowHeader === ri ? 'opacity-100' : ''}`} 
                    onMouseDown={(e) => handleRowResize(ri, e)}
                    onTouchStart={(e) => handleRowResize(ri, e)}
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
                        border: cell.borderAll ? '1px solid currentColor' : cell.borderOutside ? '1px solid currentColor' : undefined,
                        minHeight: rowHeights[ri],
                        height: 'auto',
                        width: colWidths[ci],
                      }}
                      colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                      rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                      contentEditable
                      suppressContentEditableWarning
                      onMouseDown={() => handleMouseDown(ri, ci)}
                      onMouseOver={() => handleMouseOver(ri, ci)}
                      onTouchStart={(e) => handleTouchStart(e, ri, ci)}
                      onKeyDown={(e) => { handleKeyDownCell(e, ri, ci); updateSelectionRect(); }}
                      onInput={e => {
                        if (activeCell && activeCell.row === ri && activeCell.col === ci) {
                          setFormulaValue((e.target as HTMLElement).innerText);
                          updateSelectionRect();
                        }
                      }}
                      onBlur={e => {
                        skipHtmlUpdateForCell.current = { row: ri, col: ci };
                        updateCell(ri, ci, { text: (e.target as HTMLElement).innerHTML });
                      }}
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

      {/* Add Table Button */}
      <div className="mt-4 flex gap-3">
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
    </div>
  );
};

export default ExcelEditor;
