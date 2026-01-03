import { Skeleton } from '@gravity-ui/uikit';

export function ScrobbleCardSkeleton() {
  return (
    <div className="scrobble-card">
      {/* Album Art */}
      <div className="scrobble-art-container">
        <Skeleton className="scrobble-art" style={{ width: 64, height: 64, borderRadius: 4 }} />
      </div>

      {/* Like Button placeholder - matching real button placement */}
      <Skeleton className="scrobble-like-btn" style={{ width: 32, height: 32, borderRadius: '50%' }} />

      {/* Track Info */}
      <div className="scrobble-info">
        {/* Track title skeleton */}
        <Skeleton style={{ width: '70%', height: 18, marginBottom: 6 }} />

        {/* Artist name skeleton */}
        <Skeleton style={{ width: '50%', height: 14, marginBottom: 8 }} />

        {/* User info skeleton */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Skeleton style={{ width: 24, height: 24, borderRadius: '50%' }} />
          <Skeleton style={{ width: 100, height: 14 }} />
        </div>
      </div>

      {/* Likes Count + Time */}
      <div className="scrobble-meta">
        <Skeleton style={{ width: 60, height: 12 }} />
      </div>
    </div>
  );
}

/**
 * Multiple skeleton cards for initial loading
 */
export function ScrobbleCardSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <ScrobbleCardSkeleton key={`skeleton-${index}`} />
      ))}
    </>
  );
}
