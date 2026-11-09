import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { queryKeys } from '@/services/api/queryKeys';
import { listAdminMedia } from '@/services/cms/adminMediaService';
import { getErrorMessage } from '@/utils/apiMessage';
import { cn } from '@/utils/cn';

interface MediaPickerProps {
  value: number | null;
  onChange: (mediaId: number | null) => void;
  disabled?: boolean;
}

export function MediaPicker({ value, onChange, disabled = false }: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const listParams = { page: 1, limit: 24, sortOrder: 'desc' as const };
  const query = useQuery({
    queryKey: queryKeys.cms.media.list(listParams),
    queryFn: ({ signal }) => listAdminMedia(listParams, { signal }),
    enabled: open,
    select: (response) => response.data,
  });

  const images = useMemo(
    () => (query.data?.items ?? []).filter((item) => item.mimeType.startsWith('image/')),
    [query.data],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-sans text-body-sm text-on-surface-variant">
          {value ? `Selected media ID: ${value}` : 'No featured image selected'}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="md"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? 'Hide library' : 'Choose from media'}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="md"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            Clear
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="border border-outline-variant/40 bg-surface-container-low p-4">
          {query.isLoading ? <LoadingState message="Loading media…" /> : null}
          {query.isError ? (
            <ErrorState
              message={getErrorMessage(query.error, 'Unable to load media library.')}
              onRetry={() => void query.refetch()}
            />
          ) : null}
          {query.isSuccess && images.length === 0 ? (
            <EmptyState
              title="No images available"
              description="Upload an image in Media Library first."
            />
          ) : null}
          {images.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {images.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onChange(item.id);
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full border p-2 text-left transition-colors',
                      value === item.id
                        ? 'border-secondary bg-secondary-container/30'
                        : 'border-outline-variant/40 bg-surface-container-lowest hover:border-secondary',
                    )}
                  >
                    <img
                      src={item.url}
                      alt={item.altText ?? item.originalName}
                      className="mb-2 h-24 w-full object-cover"
                      loading="lazy"
                    />
                    <span className="block truncate font-sans text-caption text-on-surface-variant">
                      {item.originalName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
