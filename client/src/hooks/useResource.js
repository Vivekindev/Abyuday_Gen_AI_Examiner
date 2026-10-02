import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "../lib/api";

export default function useResource(
  path,
  { method = "get", interval = 0 } = {},
) {
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([path, method, revision]);
  const [state, setState] = useState({
    key: null,
    data: null,
    error: "",
    loading: true,
  });
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  const setData = useCallback(
    (value) =>
      setState((previous) => ({
        ...previous,
        key,
        data:
          typeof value === "function"
            ? value(previous.key === key ? previous.data : null)
            : value,
      })),
    [key],
  );
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    setState({ key, data: null, error: "", loading: !!path });
    const fetchData = async () => {
      if (running || !path) return;
      running = true;
      try {
        const response = await api.request({
          url: path,
          method,
          signal: controller.signal,
        });
        if (!controller.signal.aborted)
          setState({ key, data: response.data, error: "", loading: false });
      } catch (requestError) {
        if (!controller.signal.aborted)
          setState((previous) => ({
            key,
            data: [401, 403].includes(requestError.response?.status)
              ? null
              : previous.data,
            error: errorMessage(
              requestError,
              "We could not load this page. Please try again.",
            ),
            loading: false,
          }));
      } finally {
        running = false;
      }
    };
    fetchData();
    const timer = interval && path ? setInterval(fetchData, interval) : null;
    return () => {
      controller.abort();
      if (timer) clearInterval(timer);
    };
  }, [path, method, key, interval]);
  const current =
    state.key === key ? state : { data: null, error: "", loading: !!path };
  return { ...current, setData, reload };
}
