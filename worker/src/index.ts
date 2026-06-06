function json(data: any, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "https://bulk-sender-fairouzz11.pages.dev",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return json({ ok: true });
    }

    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "bulk-sender-fairouzz-api"
      });
    }

    if (url.pathname === "/api/db-test") {
      const result = await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      ).all();

      return json({
        ok: true,
        tables: result.results
      });
    }

    if (url.pathname === "/api/campaigns" && request.method === "GET") {
      const result = await env.DB.prepare(
        "SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 50"
      ).all();

      return json({
        ok: true,
        campaigns: result.results
      });
    }

    if (url.pathname === "/api/templates" && request.method === "GET") {
      const result = await env.DB.prepare(
        "SELECT * FROM templates ORDER BY created_at DESC LIMIT 50"
      ).all();

      return json({
        ok: true,
        templates: result.results
      });
    }

    return json({
      ok: false,
      error: "Route not found"
    }, 404);
  }
};
