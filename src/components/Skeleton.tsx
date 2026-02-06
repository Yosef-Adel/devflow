interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-white/5 rounded ${className}`}
    />
  );
}

export function SkeletonText({ className = "" }: SkeletonProps) {
  return <Skeleton className={`h-4 ${className}`} />;
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`bg-background-card rounded-xl p-4 ${className}`}>
      <Skeleton className="h-3 w-20 mb-4" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonTimeline() {
  return (
    <div className="bg-background-card rounded-xl p-4">
      <Skeleton className="h-3 w-16 mb-4" />
      <div className="flex items-end gap-1.5 h-20">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="flex-1">
            <Skeleton className="w-full" style={{ height: `${20 + Math.random() * 60}%` }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-2 w-6" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonActivityFeed() {
  return (
    <div className="bg-background-card rounded-xl p-4">
      <Skeleton className="h-3 w-16 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="w-1 h-4 rounded-full" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="bg-background-card rounded-xl p-4">
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-8 w-24 mb-4" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function SkeletonListCard() {
  return (
    <div className="bg-background-card rounded-xl p-4">
      <Skeleton className="h-3 w-20 mb-4" />
      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-3 w-4" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonGoalCard() {
  return (
    <div className="bg-background-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-8" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
