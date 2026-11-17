import { cn } from "@/lib/utils";

// Shared look for text inputs, selects and textareas (16px on phones so iOS doesn't zoom in)
export const inputClass =
  "w-full rounded-lg border bg-input/30 px-3 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 md:text-sm";

export function Field({
  label,
  htmlFor,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
        {required && <span className="text-muted-foreground"> *</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
      {message}
    </p>
  );
}

// Small colored class badge: ● CHM
export function ClassBadge({
  code,
  color,
  className,
}: {
  code: string | null;
  color: string | null;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", className)}>
      <span className="size-2 rounded-full" style={{ backgroundColor: color ?? "currentColor" }} />
      {code}
    </span>
  );
}
