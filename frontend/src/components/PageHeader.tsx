type Props = {
  title: string;
  highlight: string;
  subtitle?: string; // Artık opsiyonel yaptık
  badge?: string;
  action?: React.ReactNode;
};
// components/PageHeader.tsx
// components/PageHeader.tsx
export function PageHeader({ title, highlight, action }: Props) {
  return (
    // mt-0 ve pt-0 olduğundan emin ol
    <div className="flex flex-col mt-0 pt-0 w-full">
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <span className="text-brand-primary text-[10px] font-black tracking-widest leading-none mb-1">
            {highlight}
          </span>
          <h1 className="text-2xl font-black text-brand-secondary leading-none uppercase italic">
            {title}
          </h1>
        </div>
        {action}
      </div>
      <div className="h-px w-full bg-gradient-to-r from-brand-primary/20 via-brand-surface-dark to-transparent mt-2" />
    </div>
  );
}