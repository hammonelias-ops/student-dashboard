export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        {title}
      </h1>
      {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
    </header>
  );
}

// Placeholder shown until a page is built in its stage
export function ComingSoon({ stage, children }: { stage: number; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
      <p className="mb-1 font-medium text-foreground">Coming in Stage {stage}</p>
      {children}
    </div>
  );
}
