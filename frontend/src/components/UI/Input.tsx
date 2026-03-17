interface InputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

export function Input({ label, type = 'text', value, onChange, error, placeholder }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-black uppercase tracking-widest text-brand-muted">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        // focus:ring-brand-primary ve rounded-ini (0.5rem) eklendi
        className={`border-2 px-4 py-2.5 outline-none transition-all duration-200 rounded-ini
          ${error 
            ? 'border-brand-danger focus:border-brand-danger' 
            : 'border-brand-surface focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10'
          } bg-white text-brand-secondary placeholder:text-brand-muted/50`}
      />
      {error && <span className="text-brand-danger text-[11px] font-bold uppercase italic">{error}</span>}
    </div>
  );
}