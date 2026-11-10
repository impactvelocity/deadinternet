// PostHog: page views, clicks and page leaves, in the shared hackathon
// project (642580). Every event carries product: "deadinternet" to tell it
// apart from the other entries. Local dev stays out of the numbers.
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

if (!LOCAL_HOSTS.includes(location.hostname)) {
  import("posthog-js").then(({ default: posthog }) =>
    posthog.init("phc_wHmU9xGagja5baLnbfXbBsDSepVnU7h5bBB6Do6DAdGs", {
      api_host: "https://us.i.posthog.com",
      defaults: "2026-08-30",
      // Runs before the first page view, so that one is tagged too.
      loaded: (ph) => ph.register({ product: "deadinternet" }),
    }),
  );
}
