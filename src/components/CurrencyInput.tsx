import React, { useState, useEffect } from 'react';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  name?: string;
  required?: boolean;
}

export function CurrencyInput({ value, onChange, className, placeholder, name, required }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  useEffect(() => {
    // Synchronize display value with prop value when it changes externally
    if (value !== undefined) {
      setDisplayValue(formatCurrency(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numberValue = Number(rawValue) / 100;
    
    onChange(numberValue);
    setDisplayValue(formatCurrency(numberValue));
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        className={className}
        placeholder={placeholder}
        required={required}
      />
      {/* Hidden input to ensure form submission works if using native FormData */}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
