export function BookingModal({
  isOpen, onClose, onConfirm, title, setTitle,
  roomName, floorConfig, start, end, submitting
}: any) {
  
  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric' 
    }).toUpperCase();
  };

  // Başlangıç ve bitiş aynı gün mü kontrolü
  const isSameDay = new Date(start).toDateString() === new Date(end).toDateString();

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[2000] p-4">
      <div className="fixed inset-0 bg-brand-secondary/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      
      <div className="ini-card max-w-sm w-full p-8 relative z-10 animate-in zoom-in-95 duration-200 bg-white">
        
        {/* HEADER */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className={`w-2 h-2 rounded-full animate-pulse ${floorConfig.bg.replace('text-', 'bg-')}`} />
          <h2 className="text-xl font-black text-brand-secondary uppercase italic tracking-tighter">
            Confirm Booking
          </h2>
        </div>

        {/* INFO PANEL */}
        <div className="bg-brand-surface rounded-ini p-4 mb-6 border-l-4 border-brand-primary">
          <div className="flex flex-col gap-1">
            <span className="text-[8px] font-black text-brand-muted uppercase tracking-widest">Resource</span>
            <span className="text-xs font-black text-brand-secondary uppercase">{roomName}</span>
            
            <div className="h-px bg-gray-200 my-1" />
            
            <span className="text-[8px] font-black text-brand-muted uppercase tracking-widest">Schedule</span>
            <span className="text-[10px] font-black text-brand-primary uppercase">
              {formatDate(start)}
              {!isSameDay && (
                <>
                  <span className="mx-2 text-brand-muted">—</span>
                  {formatDate(end)}
                </>
              )}
            </span>
          </div>
        </div>

        {/* INPUT */}
        <div className="space-y-6">
          <input 
            autoFocus 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="PROJECT TITLE" 
            className="w-full bg-brand-surface border-0 rounded-ini px-4 py-3 font-black text-[11px] outline-none focus:ring-1 ring-brand-primary uppercase" 
          />
          
          <div className="flex gap-2">
            <button 
              disabled={submitting || !title.trim()} 
              onClick={onConfirm} 
              className="flex-[2] bg-brand-secondary text-white py-4 rounded-ini font-black uppercase text-[10px] hover:bg-brand-primary transition-all shadow-lg active:scale-95 disabled:opacity-30"
            >
              {submitting ? 'EXECUTING...' : 'COMMIT'}
            </button>
            <button onClick={onClose} className="flex-1 bg-brand-surface text-brand-muted py-4 rounded-ini font-black uppercase text-[10px] hover:bg-gray-200">
              Abort
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}