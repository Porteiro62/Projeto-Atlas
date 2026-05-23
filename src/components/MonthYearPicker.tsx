import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthYearPickerProps {
  selectedMonth: number;
  selectedYear: number;
  onChange: (month: number, year: number) => void;
}

export function MonthYearPicker({ selectedMonth, selectedYear, onChange }: MonthYearPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(selectedYear);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync picker year when selectedYear changes externally
  useEffect(() => {
    setPickerYear(selectedYear);
  }, [selectedYear]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const changeMonth = (offset: number) => {
    let newMonth = selectedMonth + offset;
    let newYear = selectedYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    onChange(newMonth, newYear);
  };

  const months = [
    { value: 0, label: 'Jan' },
    { value: 1, label: 'Fev' },
    { value: 2, label: 'Mar' },
    { value: 3, label: 'Abr' },
    { value: 4, label: 'Mai' },
    { value: 5, label: 'Jun' },
    { value: 6, label: 'Jul' },
    { value: 7, label: 'Ago' },
    { value: 8, label: 'Set' },
    { value: 9, label: 'Out' },
    { value: 10, label: 'Nov' },
    { value: 11, label: 'Dez' },
  ];

  const currentMonthName = format(new Date(selectedYear, selectedMonth), 'MMMM yyyy', { locale: ptBR });

  return (
    <div className="relative" ref={containerRef}>
      {/* Month Year Bar */}
      <div className="flex items-center bg-white border border-stone-200 rounded-xl px-2 py-1 shadow-sm h-[42px]">
        <button 
          onClick={() => changeMonth(-1)} 
          className="p-1 text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
          type="button"
        >
          <ChevronLeft size={20} />
        </button>
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 text-[10px] font-bold uppercase tracking-widest text-stone-700 min-w-[130px] hover:text-atlas-emerald transition-colors cursor-pointer text-center select-none"
          type="button"
        >
          {currentMonthName}
        </button>

        <button 
          onClick={() => changeMonth(1)} 
          className="p-1 text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
          type="button"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-stone-200 shadow-2xl rounded-3xl p-6 z-[999] origin-top-right animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Year selector header */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
            <button
              onClick={() => setPickerYear(prev => prev - 1)}
              className="p-1.5 hover:bg-stone-50 rounded-lg text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
              type="button"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="flex items-center gap-1.5 text-stone-800 font-bold text-sm select-none">
              <Calendar size={14} className="text-stone-400" />
              <span>{pickerYear}</span>
            </div>

            <button
              onClick={() => setPickerYear(prev => prev + 1)}
              className="p-1.5 hover:bg-stone-50 rounded-lg text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
              type="button"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Months Grid */}
          <div className="grid grid-cols-3 gap-2">
            {months.map(m => {
              const isSelected = selectedMonth === m.value && selectedYear === pickerYear;
              return (
                <button
                  key={m.value}
                  onClick={() => {
                    onChange(m.value, pickerYear);
                    setIsOpen(false);
                  }}
                  className={`py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-stone-900 text-white shadow-md'
                      : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                  }`}
                  type="button"
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
