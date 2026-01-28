import React from 'react';
import type { ViewMode } from '../types';

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ mode, onChange }) => (
  <div className="flex rounded-xl border border-slate-200 overflow-hidden">
    <button
      onClick={() => onChange('map')}
      className={`px-4 py-2 text-xs font-bold tracking-wider transition-colors ${
        mode === 'map'
          ? 'bg-[#111217] text-white'
          : 'bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      КАРТА
    </button>
    <button
      onClick={() => onChange('list')}
      className={`px-4 py-2 text-xs font-bold tracking-wider transition-colors ${
        mode === 'list'
          ? 'bg-[#111217] text-white'
          : 'bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      СПИСОК
    </button>
  </div>
);

export default ViewToggle;
