interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ children, onClick, type = 'button', variant = 'primary', loading, disabled }: ButtonProps) {
  const baseStyles = "w-full py-3 px-6 font-black uppercase tracking-widest text-[11px] transition-all duration-300 rounded-ini shadow-sm active:transform active:scale-[0.98]";
  
  const variants = {
    primary: "bg-brand-primary text-white hover:bg-brand-primary/90 disabled:bg-brand-muted shadow-brand-primary/20",
    secondary: "bg-brand-secondary text-white hover:opacity-90 disabled:bg-brand-muted"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${loading ? 'cursor-not-allowed opacity-70' : ''}`}
    >
      <div className="flex items-center justify-center gap-2">
        {loading && (
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {loading ? 'Yükleniyor...' : children}
      </div>
    </button>
  );
}