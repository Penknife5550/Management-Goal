// Einfacher Lade-Platzhalter (Skeleton) - vermittelt gefuehlte Geschwindigkeit.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} aria-hidden="true" />;
}
