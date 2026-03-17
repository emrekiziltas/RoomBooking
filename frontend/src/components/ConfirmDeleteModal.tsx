import type { Booking } from '../types/index';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  data: Booking | null;
  onConfirm: (id: number) => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({ isOpen, data, onConfirm, onCancel }: ConfirmDeleteModalProps) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 bg-brand-secondary/90 backdrop-blur-md flex items-center justify-center z-[7000] p-6 text-center">
      {/* Edit modalı ile aynı border ve padding değerleri */}
      <div className="bg-white border-4 border-brand-danger p-8 w-full max-w-sm shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-in zoom-in-95 duration-200">
        
        {/* Daha agresif bir ikon alanı */}
        <div className="w-20 h-20 bg-brand-danger/10 text-brand-danger border-4 border-brand-danger/20 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl animate-pulse">
          ⚠️
        </div>
        
        <h2 className="text-2xl font-black text-brand-secondary uppercase italic mb-2 tracking-tighter">
          Final Warning
        </h2>
        
        {/* Bilgi Kutusu: Edit modaldaki Grid yapısına benzer şekilde */}
        <div className="bg-brand-surface border-l-4 border-brand-danger p-4 mb-8 text-left">
          <p className="text-[9px] font-black text-brand-danger uppercase tracking-[0.2em] mb-2">Target for Deletion:</p>
          <p className="text-sm font-black text-brand-secondary uppercase truncate leading-tight">{data.title}</p>
          <div className="mt-2 flex items-center gap-2 opacity-60">
             <span className="text-[10px] font-bold text-brand-muted uppercase">
               {new Date(data.start_time).toLocaleDateString('en-GB')}
             </span>
             <span className="w-1 h-1 bg-brand-muted rounded-full"></span>
             <span className="text-[10px] font-bold text-brand-muted uppercase truncate">
               {data.room?.name || 'Resource'}
             </span>
          </div>
        </div>

        <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.3em] mb-10 leading-relaxed">
          Irreversible Action
        </p>
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => onConfirm(data.id)}
            className="w-full bg-brand-danger text-white py-5 font-black text-xs uppercase tracking-[0.2em] hover:bg-red-700 transition-all shadow-xl active:scale-95"
          >
            Execute Delete
          </button>
          <button 
            onClick={onCancel}
            className="w-full bg-brand-surface text-brand-muted py-4 font-black text-xs uppercase tracking-widest hover:text-brand-secondary transition-all"
          >
            Keep Record
          </button>
        </div>
      </div>
    </div>
  );
}