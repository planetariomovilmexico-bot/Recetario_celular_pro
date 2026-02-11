import React from 'react';

interface AutocompleteProps<T> {
  items: T[];
  query: string;
  onSelect: (item: T) => void;
  getDisplayValue: (item: T) => string;
}

const Autocomplete = <T,>({ items, query, onSelect, getDisplayValue }: AutocompleteProps<T>) => {
  if (!query || query.length < 2) return null;

  const filtered = items.filter(item => 
    getDisplayValue(item).toLowerCase().includes(query.toLowerCase())
  ).slice(0, 15);

  if (filtered.length === 0) return null;

  return (
    <div className="absolute z-[150] mt-2 w-full bg-white border-2 border-indigo-100 rounded-2xl shadow-2xl max-h-72 overflow-auto no-print animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="bg-indigo-600 px-4 py-2.5 text-[10px] font-black text-white sticky top-0 border-b border-indigo-700 uppercase tracking-[0.2em] flex items-center justify-between">
        <span>Sugerencias Encontradas</span>
        <span className="bg-white/20 px-2 py-0.5 rounded-full text-[8px]">{filtered.length} resultados</span>
      </div>
      {filtered.map((item, idx) => (
        <button
          key={idx}
          className="w-full text-left px-5 py-3.5 hover:bg-indigo-50 text-slate-800 text-sm font-bold border-b last:border-0 border-slate-100 transition-all flex items-center gap-3 active:bg-indigo-100"
          onClick={() => {
            onSelect(item);
          }}
          type="button"
        >
          <div className="w-2 h-2 rounded-full bg-indigo-400 group-hover:bg-indigo-600 transition-colors"></div>
          <span className="flex-1 truncate">{getDisplayValue(item)}</span>
        </button>
      ))}
    </div>
  );
};

export default Autocomplete;