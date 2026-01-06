import { Skeleton } from '@gravity-ui/uikit';

export function ScrobbleCardSkeleton() {
  return (
    <div className="scrobble-card">
      {/* Album Art */}
      <div className="scrobble-art-container">
        <Skeleton className="scrobble-art" style={{ width: '100%', height: '100%', borderRadius: 8 }} />
      </div>

      {/* Like Button placeholder */}
      <div className="scrobble-like-btn" style={{ opacity: 0.3 }}>
        <Skeleton style={{ width: 16, height: 16, borderRadius: '50%' }} />
      </div>

      {/* Track Info */}
      <div className="scrobble-info">
        <div className="scrobble-track-row">
          <Skeleton style={{ width: '70%', height: 18, marginBottom: 4 }} />
        </div>
        <Skeleton style={{ width: '50%', height: 16, marginBottom: 8 }} />

        {/* User info skeleton */}
        <div className="scrobble-user" style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
          <Skeleton className="scrobble-user-avatar" style={{ width: 20, height: 20, borderRadius: '50%' }} />
          <Skeleton style={{ width: 100, height: 14 }} />
        </div>
      </div>

      {/* Likes Count + Time */}
      <div className="scrobble-meta">
        <Skeleton style={{ width: 50, height: 14 }} />
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
