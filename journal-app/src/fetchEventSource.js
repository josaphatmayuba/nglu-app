// Client SSE base sur fetch + ReadableStream (bug #35/#39) : le JWT part dans
// l'en-tete Authorization, JAMAIS dans l'URL (donc pas dans les logs nginx).
// Expose la meme surface qu'EventSource (addEventListener/onopen/onerror/
// onmessage/close) : les appelants gardent leur logique de reconnexion/backoff.
// Un echec (HTTP != 200, coupure, fin de flux) declenche "error" ; l'appelant
// ferme et replanifie.
export class FetchEventSource {
  /**
   * @param {string} url
   * @param {{ getToken: () => string }} opts
   */
  constructor(url, { getToken }) {
    this._listeners = new Map();
    this._ctrl = new AbortController();
    this._closed = false;
    this.onopen = null;
    this.onerror = null;
    this.onmessage = null;
    this._run(url, getToken);
  }

  addEventListener(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type).add(fn);
  }

  removeEventListener(type, fn) {
    this._listeners.get(type)?.delete(fn);
  }

  close() {
    this._closed = true;
    try { this._ctrl.abort(); } catch { /* ignore */ }
  }

  _emit(type, event) {
    if (this._closed) return;
    const direct = type === "open" ? this.onopen : type === "error" ? this.onerror : type === "message" ? this.onmessage : null;
    try { direct?.(event); } catch { /* handler */ }
    this._listeners.get(type)?.forEach((fn) => {
      try { fn(event); } catch { /* handler */ }
    });
  }

  async _run(url, getToken) {
    try {
      const token = getToken();
      if (!token) throw new Error("no token");
      const res = await fetch(url, {
        headers: { Accept: "text/event-stream", Authorization: `Bearer ${token}` },
        cache: "no-store",
        credentials: "omit",
        signal: this._ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error(`SSE HTTP ${res.status}`);
      this._emit("open", { type: "open" });
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buf = "";
      let evType = "";
      let data = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.search(/\r\n|\n|\r/)) !== -1) {
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + (buf.startsWith("\r\n", nl) ? 2 : 1));
          if (line === "") {
            if (data.length) this._emit(evType || "message", { type: evType || "message", data: data.join("\n") });
            evType = "";
            data = [];
          } else if (line[0] !== ":") {
            const i = line.indexOf(":");
            const field = i === -1 ? line : line.slice(0, i);
            let val = i === -1 ? "" : line.slice(i + 1);
            if (val[0] === " ") val = val.slice(1);
            if (field === "event") evType = val;
            else if (field === "data") data.push(val);
          }
        }
      }
      throw new Error("SSE stream ended");
    } catch {
      this._emit("error", { type: "error" });
    }
  }
}
