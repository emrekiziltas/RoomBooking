interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ children, onClick, type = 'button', variant = 'primary', loading, disabled }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full py-2 px-4 rounded-lg font-medium transition-colors
        ${variant === 'primary'
          ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300'
          : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
        }`}
    >
      {loading ? 'Yükleniyor...' : children}
    </button>
  );
}