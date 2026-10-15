import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async fetcher, tracking loading/error/data state, and reruns it
 * whenever `deps` changes. Guards against setting state after the component
 * has moved on to a newer request (e.g. the user changed a filter quickly).
 */
export function useAsync(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const run = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (id === requestId.current) setData(result);
      })
      .catch((err) => {
        if (id === requestId.current) setError(err.message || 'Something went wrong');
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, reload: run, setData };
}
