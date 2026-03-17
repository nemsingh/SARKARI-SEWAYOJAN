import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ExcelEditor from '@/components/admin/ExcelEditor';

const AdminExcelFullscreen = () => {
  const [searchParams] = useSearchParams();
  const lang = searchParams.get('lang') || 'en';
  const channelName = searchParams.get('channel') || 'excel-channel';
  const [tableCount, setTableCount] = useState(0);

  const handleAddTable = (html: string) => {
    try {
      const bc = new BroadcastChannel(channelName);
      bc.postMessage({ type: 'add-table', lang, html });
      bc.close();
      setTableCount(prev => prev + 1);
    } catch (e) {
      console.error('BroadcastChannel error:', e);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">
          📊 Excel Editor — {lang === 'hi' ? 'Hindi' : 'English'} (Full Screen)
        </h1>
        <div className="flex items-center gap-3">
          {tableCount > 0 && (
            <span className="text-sm bg-primary-foreground/20 px-3 py-1 rounded-full">
              ✅ {tableCount} table(s) added to post
            </span>
          )}
          <span className="text-xs opacity-70">Tables sync automatically to your post editor</span>
        </div>
      </div>
      <div className="flex-1 p-2">
        <ExcelEditor onAddTable={handleAddTable} />
      </div>
    </div>
  );
};

export default AdminExcelFullscreen;
