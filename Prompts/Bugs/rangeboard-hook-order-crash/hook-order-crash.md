prompt: When selecting a day nothing loads and all components disappear. This is in console React has detected a change in the order of Hooks called by RangeBoard. This will lead to bugs and errors if not fixed. For more information, read the Rules of Hooks: https://react.dev/link/rules-of-hooks

   Previous render            Next render
   ------------------------------------------------------
1. useCallback                useCallback
2. useCallback                useCallback
3. useSyncExternalStore       useSyncExternalStore
4. useDebugValue              useDebugValue
5. useState                   useState
6. useState                   useState
7. useState                   useState
8. useMemo                    useMemo
9. useEffect                  useEffect
10. useMemo                   useMemo
11. undefined                 useMemo
   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ rror: Rendered more hooks than during the previous render An error occurred in the <RangeBoard> component.

Consider adding an error boundary to your tree to customize error handling behavior.
Visit https://react.dev/link/error-boundaries to learn more about error boundaries.

answer: Fixed the hook order by moving the early return below all hooks.

suggestion: Tell me if you want a quick regression check.
