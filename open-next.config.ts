import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // No incremental cache binding: this storefront renders each request, so a
  // cache backend is not required. Add `r2IncrementalCache` later if you want
  // to serve cached pages from R2.
});
