'use strict';
function requestLocation(url,upload) {
  // apiv2.Client.requestURL accepts a path with an existing query. Keep the
  // signed upload query intact: URLSearchParams would re-encode characters.
  return upload?{path:url.pathname+url.search}:{path:url.pathname,queryParams:url.searchParams};
}
module.exports={requestLocation};
