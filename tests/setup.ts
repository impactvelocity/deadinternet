// Shared Vitest setup, run before every test file (see `test.setupFiles`).
//
// jsdom has no `window.matchMedia`. This stub answers "no match" so code that
// checks media queries (for example prefers-reduced-motion) can run. The
// `typeof window` guard keeps files that opt into `// @vitest-environment node`
// working.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
