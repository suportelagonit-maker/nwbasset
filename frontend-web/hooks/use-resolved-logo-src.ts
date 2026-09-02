'use client';

import { useEffect, useMemo, useState } from 'react';

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean)));
}

export function useResolvedLogoSrc(candidates: string[], fallbackSrc?: string | null) {
  const orderedCandidates = useMemo(() => unique([...candidates, fallbackSrc]), [candidates, fallbackSrc]);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!orderedCandidates.length) {
      setResolvedSrc(null);
      return () => {
        cancelled = true;
      };
    }

    let index = 0;

    const tryNext = () => {
      if (cancelled) {
        return;
      }

      if (index >= orderedCandidates.length) {
        setResolvedSrc(null);
        return;
      }

      const candidate = orderedCandidates[index];
      index += 1;

      const image = new Image();
      image.onload = () => {
        if (!cancelled) {
          setResolvedSrc(candidate);
        }
      };
      image.onerror = () => {
        tryNext();
      };
      image.src = candidate;
    };

    setResolvedSrc(null);
    tryNext();

    return () => {
      cancelled = true;
    };
  }, [orderedCandidates]);

  return resolvedSrc;
}

