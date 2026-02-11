
import React from 'react';

interface AutocompleteProps<T> {
  items: T[];
  query: string;
  onSelect: (item: T) => void;
  getDisplayValue: (item: T) => string;
}

const Autocomplete = <T,>({ items, query, onSelect, getDisplayValue }: AutocompleteProps<T>) => {
  if (!query) return null;

  const filtered = items.filter(item => 
    getDisplayValue(item).toLowerCase().includes(query.toLowerCase())
  ).slice(0, 10);

  if (filtered.length === 0) return null;

  return (
    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto no-print">
      <div className="bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 sticky top-0 border-b">
        Sugerencias
      </div>
      {filtered.map((item, idx) => (
        <button
          key={idx}
          className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm border-b last:border-0 border-gray-100 transition-colors"
          onClick={() => onSelect(item)}
        >
          {getDisplayValue(item)}
        </button>
      ))}
    </div>
  );
};

export default Autocomplete;
