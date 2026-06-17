export function LoadingSkeleton({ className = "h-4 w-full" }) {
  return (
    <div className={`animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800 ${className}`} />
  );
}
