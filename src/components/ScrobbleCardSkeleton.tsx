import { Skeleton } from '@gravity-ui/uikit';
import './ScrobbleCard.css';

export function ScrobbleCardSkeleton() {
  return (
    <div className="scrobble-card">
      <div className="scrobble-card-content">
        <div className="scrobble-card-left">
          {/* Album art skeleton */}
          <Skeleton className="scrobble-card-album-art" style={{ width: 64, height: 64 }} />
        </div>

        <div className="scrobble-card-middle">
          {/* Track title skeleton */}
          <Skeleton style={{ width: '70%', height: 20, marginBottom: 8 }} />

          {/* Artist name skeleton */}
          <Skeleton style={{ width: '50%', height: 16, marginBottom: 8 }} />

          {/* User info skeleton */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Skeleton style={{ width: 24, height: 24, borderRadius: '50%' }} />
            <Skeleton style={{ width: 100, height: 14 }} />
          </div>
        </div>

        <div className="scrobble-card-right">
          {/* Time ago skeleton */}
          <Skeleton style={{ width: 60, height: 14, marginBottom: 8 }} />

          {/* Like button skeleton */}
          <Skeleton style={{ width: 40, height: 32, borderRadius: 8 }} />
        </div>
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
