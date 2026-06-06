function json(data: any, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "https://bulk-sender-fairouzz11.pages.dev",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token"
    }
  });
}

function normalizeIraqiPhone(input: string) {
  const digits = String(input || "").replace(/\D/g, "");

  if (digits.startsWith("964") && digits.length === 13) return "+" + digits;
  if (digits.startsWith("0") && digits.length === 11) return "+964" + digits.slice(1);
  if (digits.startsWith("7") && digits.length === 10) return "+964" + digits;

  return null;
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
        service: "bulk-sender-fairouzz-api",
        hasNabdaSecret: Boolean(env.NABDA_API_KEY),
        hasAdminToken: Boolean(env.ADMIN_API_TOKEN)
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

    if (url.pathname === "/api/logs") {
      const result = await env.DB.prepare(
        "SELECT id, phone, business_name, status, provider_response, error, created_at FROM bulk_message_logs ORDER BY id DESC LIMIT 20"
      ).all();

      return json({
        ok: true,
        logs: result.results
      });
    }

    if (url.pathname === "/api/send-one" && request.method === "POST") {
      const body: any = await request.json().catch(() => null);

      if (!body) {
        return json({ ok: false, error: "Invalid JSON body" }, 400);
      }

      const phone = normalizeIraqiPhone(body.phone);
      const message = String(body.message || "").trim();
      const businessName = String(body.businessName || "").trim();
      const campaignId = body.campaignId ? Number(body.campaignId) : null;
      const dryRun = Boolean(body.dryRun);

      if (!phone) {
        return json({ ok: false, error: "Invalid Iraqi phone number" }, 400);
      }

      if (!message) {
        return json({ ok: false, error: "Message is required" }, 400);
      }

      const blocked = await env.DB.prepare(
        "SELECT phone FROM do_not_send WHERE phone = ? LIMIT 1"
      ).bind(phone).first();

      if (blocked) {
        await env.DB.prepare(
          "INSERT INTO bulk_message_logs (campaign_id, phone, business_name, status, provider_response, error) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(campaignId, phone, businessName, "skipped", "do_not_send", "Number is in do_not_send list").run();

        return json({
          ok: false,
          skipped: true,
          error: "Number is in do_not_send list",
          phone
        }, 409);
      }

      if (dryRun) {
        await env.DB.prepare(
          "INSERT INTO bulk_message_logs (campaign_id, phone, business_name, status, provider_response, error) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(campaignId, phone, businessName, "dry_run", "No real message sent", null).run();

        return json({
          ok: true,
          dryRun: true,
          phone,
          message,
          note: "Dry run only. No Nabda message was sent."
        });
      }

      if (!env.ADMIN_API_TOKEN) {
        return json({ ok: false, error: "Real sending is locked. Set ADMIN_API_TOKEN first." }, 403);
      }

      const adminToken = request.headers.get("X-Admin-Token") || "";
      if (adminToken !== env.ADMIN_API_TOKEN) {
        return json({ ok: false, error: "Unauthorized send request" }, 401);
      }

      if (!env.NABDA_API_KEY) {
        return json({ ok: false, error: "Missing NABDA_API_KEY secret" }, 500);
      }

      const nabdaResponse = await fetch("https://api.nabdaotp.com/api/v1/messages/send", {
        method: "POST",
        headers: {
          "Authorization": env.NABDA_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ phone, message })
      });

      const responseText = await nabdaResponse.text();

      if (!nabdaResponse.ok) {
        await env.DB.prepare(
          "INSERT INTO bulk_message_logs (campaign_id, phone, business_name, status, provider_response, error) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(campaignId, phone, businessName, "failed", responseText, `HTTP ${nabdaResponse.status}`).run();

        return json({
          ok: false,
          phone,
          status: nabdaResponse.status,
          error: responseText
        }, 502);
      }

      await env.DB.prepare(
        "INSERT INTO bulk_message_logs (campaign_id, phone, business_name, status, provider_response, error) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(campaignId, phone, businessName, "sent", responseText, null).run();

      return json({
        ok: true,
        phone,
        provider: "nabda",
        response: responseText
      });
    }

    return json({ ok: false, error: "Route not found" }, 404);
  }
};