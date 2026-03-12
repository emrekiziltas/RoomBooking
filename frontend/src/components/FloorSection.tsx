// components/FloorSection.tsx
type Props = {
  label: string;
  color: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

export function FloorSection({ label, color, isOpen, onToggle, children }: Props) {
  return (
    <div className="mb-10">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 mb-4"
      >
        <span className={`text-[10px] font-black ${color} uppercase tracking-[0.2em]`}>
          {isOpen ? '▼' : '▶'} {label}
        </span>
        <div className="flex-1 h-px bg-gray-200" />
      </button>

      {isOpen && children}
    </div>
  );
}