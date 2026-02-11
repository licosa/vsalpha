import { DurableObject } from "cloudflare:workers";

export class PhoneBuffer extends DurableObject {
  constructor(state, env) {
    super(state, env);
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/push") {
      const body = await request.json().catch(() => null);
      await this.state.storage.put("last", body);
      return new Response("stored");
    }

    if (request.method === "GET" && url.pathname === "/get") {
      const data = await this.state.storage.get("last");
      return new Response(JSON.stringify(data || {}), {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    return new Response("ok");
  }
}

export default {
  async fetch(request, env) {
    // cria 1 instância DO "global" só pra validar deploy/binding
    const id = env.PHONE_BUFFER.idFromName("global");
    const stub = env.PHONE_BUFFER.get(id);

    // só roteia /push e /get pro DO (pra teste)
    const p = new URL(request.url).pathname;
    if (p === "/push" || p === "/get") return stub.fetch(request);

    return new Response("VSALPHA worker online");
  },
};
