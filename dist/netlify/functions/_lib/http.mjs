export function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    ...extra,
  };
}

export function json(status, body, extraHeaders = {}) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json", ...corsHeaders(extraHeaders) },
    body: JSON.stringify(body),
  };
}

export function html(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders() },
    body,
  };
}
