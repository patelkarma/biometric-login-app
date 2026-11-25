import { useCallback, useState } from 'react'

/**
 * Runs an async action (usually an API call) and tracks its "busy" and "error" state,
 * so pages don't each repeat the same setBusy / try / catch / finally code.
 *
 *   const { busy, error, setError, run } = useAsyncAction()
 *   run(async () => { await api(...); navigate(...) })
 *
 * @param action       async function to run
 * @param options.busyKey  value stored in `busy` while running (default `true`).
 *                         Useful when one page has several buttons, e.g. 'code' vs 'bio'.
 * @param options.onError  extra work after a failure (the message is already in `error`)
 * @returns the action's result, or `undefined` if it failed
 */
export function useAsyncAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const run = useCallback(async (action, { busyKey = true, onError } = {}) => {
    setBusy(busyKey)
    setError(null)
    try {
      return await action()
    } catch (err) {
      setError(err.message)
      onError?.(err)
      return undefined
    } finally {
      setBusy(false)
    }
  }, [])

  return { busy, error, setError, run }
}
