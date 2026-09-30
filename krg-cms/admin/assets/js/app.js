(() => {
  const cfg = window.KrgAdmin || {};
  const uid = (p) => {
    try {
      if (globalThis.crypto && typeof crypto.randomUUID === "function") return (p || "") + crypto.randomUUID();
    } catch (e) { /* HTTP */ }
    return (p || "") + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  };
  const api = {
    async req(path, opts = {}) {
      const { headers: extraHeaders, body, ...rest } = opts;
      const res = await fetch(cfg.rest.replace(/\/$/, "") + path, {
        credentials: "same-origin",
        ...rest,
        headers: {
          "Content-Type": "application/json",
          ...(extraHeaders || {}),
          "X-WP-Nonce": cfg.nonce,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json.message || json.data?.message || json.code || "Error";
        const err = new Error(msg);
        err.status = res.status;
        err.code = json.code || json.data?.code || "";
        throw err;
      }
      return json;
    },
    get: (p) => api.req(p),
    post: (p, body) => api.req(p, { method: "POST", body }),
    put: (p, body) => api.req(p, { method: "PUT", body }),
    patch: (p, body, headers) => api.req(p, { method: "PATCH", body, headers }),
    del: (p) => api.req(p, { method: "DELETE" }),
  };
  window.MApi = api;

  const uiEsc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  window.KrgUi = {
    tokens: { color: {}, font: {}, typography: {} },
    setTokens(pack) {
      const data = pack?.data || pack || {};
      this.tokens = data.tokens || data || this.tokens;
      return this.tokens;
    },
    load() {
      if (!this._p) {
        this._p = api.get("/tokens").then((p) => this.setTokens(p)).catch(() => this.tokens);
      }
      return this._p;
    },
    hex(v) {
      const s = String(v || "").trim();
      if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
      const m = /^var\(--color-([a-z0-9-]+)\)$/i.exec(s);
      if (m) {
        const item = this.tokens.color?.[m[1]];
        const raw = item?.value || item;
        if (typeof raw === "string" && /^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
      }
      return "#1d1d1b";
    },
    colorField(label, value, attr) {
      const v = String(value || "");
      return `<label class="m-pick-label">${uiEsc(label)}
        <div class="m-pick m-pick-color">
          <input type="color" data-pick-hex value="${uiEsc(this.hex(v))}" title="Selector de color">
          <input ${attr} value="${uiEsc(v)}" class="m-pick-val" placeholder="#D94E27" spellcheck="false">
        </div>
      </label>`;
    },
    fontFamilyField(label, value, attr) {
      const v = String(value || "");
      const isVar = /^var\(--font-/.test(v);
      const opts = Object.entries(this.tokens.font || {}).map(([k, item]) => {
        const css = `var(--font-${k})`;
        return `<option value="${uiEsc(css)}" ${v === css ? "selected" : ""}>${uiEsc(item.label || k)}</option>`;
      }).join("");
      return `<label class="m-pick-label">${uiEsc(label)}
        <div class="m-pick m-pick-font">
          <select data-pick-token>
            <option value="">— Estilo —</option>
            ${opts}
            <option value="__custom__" ${v && !isVar ? "selected" : ""}>Personalizado</option>
          </select>
          <input ${attr} value="${uiEsc(v)}" class="m-pick-val" placeholder="var(--font-heading)">
        </div>
      </label>`;
    },
    fontSizeField(label, value, attr) {
      const v = String(value || "");
      const roles = {
        display: "Display", h1: "Título 1", h2: "Título 2", h3: "Título 3",
        h4: "Título 4", h5: "Título 5", h6: "Título 6", body: "Párrafo",
        lead: "Lead", small: "Pequeño", eyebrow: "Eyebrow", caption: "Caption", button: "Botón",
      };
      const typo = this.tokens.typography && Object.keys(this.tokens.typography).length ? this.tokens.typography : roles;
      const opts = Object.keys(typo).map((k) => {
        const css = `var(--text-${k}-size)`;
        return `<option value="${uiEsc(css)}" ${v === css ? "selected" : ""}>${uiEsc(roles[k] || k)}</option>`;
      }).join("");
      const px = /^(\d+(?:\.\d+)?)px$/.exec(v);
      return `<label class="m-pick-label">${uiEsc(label)}
        <div class="m-pick m-pick-size">
          <select data-pick-token>
            <option value="">— Estilo —</option>
            ${opts}
            <option value="__custom__" ${v && !/^var\(--text-/.test(v) ? "selected" : ""}>Personalizado</option>
          </select>
          <input type="number" min="8" max="200" step="1" data-pick-px value="${px ? px[1] : ""}" title="Tamaño en px">
          <span class="m-pick-unit">px</span>
          <input ${attr} value="${uiEsc(v)}" class="m-pick-val" placeholder="var(--text-h2-size)">
        </div>
      </label>`;
    },
    fontWeightField(label, value, attr) {
      const v = String(value || "");
      const weights = ["", "300", "400", "500", "600", "700", "800"];
      return `<label class="m-pick-label">${uiEsc(label)}
        <select ${attr}>
          ${weights.map((w) => `<option value="${w}" ${v === w ? "selected" : ""}>${w || "—"}</option>`).join("")}
        </select>
      </label>`;
    },
    wire(box) {
      if (!box) return;
      box.querySelectorAll(".m-pick").forEach((row) => {
        const token = row.querySelector("[data-pick-token]");
        const hex = row.querySelector("[data-pick-hex]");
        const px = row.querySelector("[data-pick-px]");
        const val = row.querySelector(".m-pick-val");
        if (!val) return;
        const fire = () => {
          val.dispatchEvent(new Event("input", { bubbles: true }));
          val.dispatchEvent(new Event("change", { bubbles: true }));
        };
        token?.addEventListener("change", () => {
          if (token.value && token.value !== "__custom__") {
            val.value = token.value;
            if (px) px.value = "";
            fire();
          }
        });
        hex?.addEventListener("input", () => {
          val.value = hex.value;
          fire();
        });
        px?.addEventListener("input", () => {
          if (!px.value) return;
          val.value = `${px.value}px`;
          if (token) token.value = "__custom__";
          fire();
        });
        val.addEventListener("input", () => {
          if (hex && /^#[0-9a-fA-F]{6}$/.test(val.value.trim())) hex.value = val.value.trim();
        });
      });
    },
  };

  const el = document.getElementById("krg-admin");
  if (!el) return;

  const toast = (t) => {
    const n = document.createElement("div");
    n.className = "m-toast";
    n.textContent = t;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2400);
  };

  const h = (strings, ...vals) => {
    // not tagged; we use html() below
  };
  const html = (s) => s;

  const nav = (active) => `
    <aside class="m-aside">
      <div class="m-aside-head">
        <a class="m-back-wp" href="${cfg.wpAdmin || "/wp-admin/"}" title="Volver a WordPress">←</a>
        <a class="m-brand" href="${cfg.admin}?page=krg">KRG <small>CMS</small></a>
      </div>
      <nav>
        <div class="grp">Contenido</div>
        ${cfg.canEditPages !== false ? `
        <a class="${active==="home"?"is-active":""}" href="${cfg.admin}?page=krg">Inicio</a>
        ${cfg.canManage ? `<a class="${active==="onboard"?"is-active":""}" href="${cfg.admin}?page=krg&view=onboard">Asistente de identidad</a>` : ""}
        <a class="${active==="pages"?"is-active":""}" href="${cfg.admin}?page=krg-pages">Páginas</a>` : ""}
        <a class="${active==="blog"?"is-active":""}" href="${cfg.admin}?page=krg-blog">Blog</a>
        ${cfg.canEditPages !== false ? `
        <a class="${active==="templates"?"is-active":""}" href="${cfg.admin}?page=krg-pages&view=templates">Plantillas</a>
        <a class="${active==="globals"?"is-active":""}" href="${cfg.admin}?page=krg-pages&view=globals">Componentes globales</a>` : ""}
        ${cfg.canManage ? `
        <div class="grp">Apariencia</div>
        <a class="${active==="design"?"is-active":""}" href="${cfg.admin}?page=krg-design">Identidad y tokens</a>
        <a class="${active==="nav"?"is-active":""}" href="${cfg.admin}?page=krg-nav">Navegación</a>
        <a href="${cfg.admin}?page=krg-builder&chrome=header">Header / Footer visual</a>
        <div class="grp">Sistema</div>
        <a class="${active==="seo"?"is-active":""}" href="${cfg.admin}?page=krg-seo">SEO</a>
        <a class="${active==="users"?"is-active":""}" href="${cfg.admin}?page=krg-users">Usuarios</a>
        <a class="${active==="settings"?"is-active":""}" href="${cfg.admin}?page=krg-settings">Configuración</a>` : ""}
        <a href="${cfg.home}" target="_blank" rel="noopener">Ver sitio</a>
      </nav>
    </aside>`;

  const shell = (active, body) => {
    el.innerHTML = `<div class="m-shell">${nav(active)}<div class="m-main-col">${body}</div></div>`;
  };

  const pageKey = cfg.page;
  const view = cfg.view;

  async function home() {
    if (view === "onboard") {
      if (!cfg.canManage) {
        shell("onboard", `<p class="m-form-error">No tienes permiso para el asistente de identidad.</p>`);
        return;
      }
      return onboard();
    }
    const d = await api.get("/bootstrap");
    shell("home", `
      <div class="m-top"><h1>Inicio</h1>
        <div class="m-row">
          <a class="m-btn ghost" href="${cfg.admin}?page=krg&view=onboard">Asistente de identidad</a>
          <a class="m-btn" href="${cfg.admin}?page=krg-pages&view=new">Nueva página</a>
        </div>
      </div>
      <p class="m-muted">Hola, ${cfg.user}. Construye páginas, cambia tokens y publica. Nada de esto es un mock.</p>
      <div class="m-cards">
        <div class="m-kpi"><span>Páginas</span><b>${d.counts.pages}</b></div>
        <div class="m-kpi"><span>Borradores</span><b>${d.counts.drafts}</b></div>
        <div class="m-kpi"><span>Entradas</span><b>${d.counts.posts}</b></div>
      </div>
      <div class="m-cards">
        <a class="m-kpi" href="${cfg.admin}?page=krg&view=onboard" style="text-decoration:none;color:inherit"><span>Marca</span><b style="font-size:18px">Asistente</b></a>
        <a class="m-kpi" href="${cfg.admin}?page=krg-builder&chrome=header" style="text-decoration:none;color:inherit"><span>Chrome</span><b style="font-size:18px">Header / Footer</b></a>
        <a class="m-kpi" href="${cfg.admin}?page=krg-design" style="text-decoration:none;color:inherit"><span>Tokens</span><b style="font-size:18px">Apariencia</b></a>
      </div>
      <div class="m-panel" style="padding:16px 20px">
        <h3>Páginas recientes</h3>
        <ul>${(d.pages||[]).slice(0,8).map(p => `<li><a href="${cfg.admin}?page=krg-builder&id=${p.id}">${esc(p.title)}</a> · ${p.status}</li>`).join("")}</ul>
      </div>`);
  }

  function contrastHint(bg, fg) {
    const hex = (v) => {
      const m = /^#?([0-9a-fA-F]{6})$/.exec(v || "");
      return m ? m[1] : null;
    };
    const a = hex(bg), b = hex(fg);
    if (!a || !b) return "";
    const lum = (h) => {
      const c = [0, 1, 2].map((i) => {
        const n = parseInt(h.slice(i * 2, i * 2 + 2), 16) / 255;
        return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const ratio = (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    return ratio < 4.5 ? `Contraste ${ratio.toFixed(1)}:1 — conviene revisar (objetivo AA ≥ 4.5).` : `Contraste ${ratio.toFixed(1)}:1 (AA).`;
  }

  async function onboard() {
    const [identity, tokensPack, header] = await Promise.all([api.get("/identity"), api.get("/tokens"), api.get("/header")]);
    const tokens = tokensPack.data || tokensPack;
    const col = (k, fallback) => tokens.tokens?.color?.[k]?.value || fallback;
    const data = {
      siteName: identity.siteName || "",
      tagline: identity.tagline || "",
      logoId: identity.logoId || 0,
      logoUrl: identity.logoUrl || "",
      faviconId: identity.faviconId || 0,
      faviconUrl: identity.faviconUrl || "",
      ctaText: header.ctaText || "Contacto",
      ctaUrl: header.ctaUrl || "/contacto/",
      heroTitle: "",
      heroSubtitle: "",
      colors: {
        primary: col("primary", "#D94E27"),
        secondary: col("secondary", "#512517"),
        tertiary: col("tertiary", "#E19C31"),
        background: col("background", "#FFFFFF"),
        surface: col("surface", "#F5F5F3"),
        text: col("text", "#1D1D1B"),
        success: col("success", "#7EB733"),
        info: col("info", "#274E97"),
      },
    };
    let step = 1;
    const paint = () => {
      const c = data.colors;
      shell("onboard", `
        <div class="m-top"><h1>Asistente de identidad</h1><span class="m-muted">Paso ${step} de 3</span></div>
        <div class="m-panel" style="padding:20px;margin-bottom:16px">
          ${step === 1 ? `
            <h3>1. Marca</h3>
            <form class="m-form-grid" id="s1">
              <label class="m-field">Nombre del sitio <input name="siteName" value="${esc(data.siteName)}"></label>
              <label class="m-field">Eslogan <input name="tagline" value="${esc(data.tagline)}"></label>
              <label class="m-field">Logo del sitio
                <input name="logoId" type="hidden" value="${data.logoId}">
                <div class="m-media-row">
                  ${data.logoUrl ? `<img class="m-thumb m-thumb-logo" src="${esc(data.logoUrl)}" alt="Logo">` : `<span class="m-thumb m-thumb-empty">Sin logo</span>`}
                  <button type="button" class="m-btn ghost" id="pick">Elegir logo</button>
                </div>
              </label>
              <label class="m-field">Favicon (icono de pestaña)
                <input name="faviconId" type="hidden" value="${data.faviconId}">
                <div class="m-media-row">
                  ${data.faviconUrl ? `<img class="m-thumb m-thumb-fav" src="${esc(data.faviconUrl)}" alt="Favicon">` : `<span class="m-thumb m-thumb-empty">32×32</span>`}
                  <button type="button" class="m-btn ghost" id="pick-fav">Elegir favicon</button>
                </div>
                <small class="m-muted">PNG o ICO. Se muestra en la pestaña del navegador y como apple-touch-icon.</small>
              </label>
              <label class="m-field">Titular del hero (home) <input name="heroTitle" value="${esc(data.heroTitle)}" placeholder="Déjalo vacío para no tocar el hero"></label>
              <label class="m-field">Subtítulo del hero <input name="heroSubtitle" value="${esc(data.heroSubtitle)}"></label>
            </form>` : ""}
          ${step === 2 ? `
            <h3>2. Paleta</h3>
            <p class="m-muted">Se escribe en tokens. Los componentes usan var(--color-primary), no estos hex.</p>
            <div id="pal">${Object.entries(c).map(([k,v]) => `<div class="m-field-row">
              <span>${esc(k)}</span>
              <input data-c="${k}" value="${esc(v)}">
              <input class="m-color" type="color" data-cp="${k}" value="${/^#[0-9a-fA-F]{6}$/.test(v)?v:"#000000"}">
            </div>`).join("")}</div>
            <p class="m-muted" id="hint">${esc(contrastHint(c.background, c.text))}</p>
            <div style="margin-top:16px;padding:20px;border-radius:16px;background:${esc(c.background)};color:${esc(c.text)};border:1px solid ${esc(c.secondary)}22">
              <p style="margin:0 0 8px;letter-spacing:.12em;text-transform:uppercase;font-size:11px;color:${esc(c.primary)}">${esc(data.siteName || "Marca")}</p>
              <p style="font-family:Palatino,Georgia,serif;font-size:28px;margin:0 0 12px">${esc(data.heroTitle || "Titular de muestra")}</p>
              <span style="display:inline-block;padding:10px 16px;border-radius:8px;background:${esc(c.primary)};color:#fff">${esc(data.ctaText || "CTA")}</span>
            </div>` : ""}
          ${step === 3 ? `
            <h3>3. Header</h3>
            <label class="m-field">Texto del botón <input id="ctaText" value="${esc(data.ctaText)}"></label>
            <label class="m-field">URL del botón <input id="ctaUrl" value="${esc(data.ctaUrl)}"></label>
            <p class="m-muted">Al aplicar se actualizan identidad, tokens, header y —si escribiste un titular— el hero de la home publicada.</p>` : ""}
        </div>
        <div class="m-row">
          ${step > 1 ? `<button class="m-btn ghost" id="prev">Atrás</button>` : `<a class="m-btn ghost" href="${cfg.admin}?page=krg">Cancelar</a>`}
          ${step < 3 ? `<button class="m-btn" id="next">Continuar</button>` : `<button class="m-btn" id="apply">Aplicar identidad</button>`}
        </div>`);
      const bindMedia = (btnId, idKey, urlKey, title) => {
        const pick = el.querySelector(btnId);
        if (pick && window.wp?.media) {
          pick.onclick = () => {
            const frame = wp.media({ title, multiple: false, library: { type: "image" } });
            frame.on("select", () => {
              const att = frame.state().get("selection").first().toJSON();
              data[idKey] = att.id;
              data[urlKey] = att.url;
              const hidden = el.querySelector(`[name=${idKey}]`);
              if (hidden) hidden.value = att.id;
              paint();
            });
            frame.open();
          };
        }
      };
      bindMedia("#pick", "logoId", "logoUrl", "Logo");
      bindMedia("#pick-fav", "faviconId", "faviconUrl", "Favicon");
      el.querySelectorAll("[data-c]").forEach((inp) => {
        const p = el.querySelector(`[data-cp="${inp.dataset.c}"]`);
        const sync = () => {
          data.colors[inp.dataset.c] = inp.value;
          if (p && /^#[0-9a-fA-F]{6}$/.test(inp.value)) p.value = inp.value;
          const hint = el.querySelector("#hint");
          if (hint) hint.textContent = contrastHint(data.colors.background, data.colors.text);
        };
        inp.oninput = sync;
        if (p) p.oninput = () => { inp.value = p.value; sync(); };
      });
      el.querySelector("#next")?.addEventListener("click", () => {
        if (step === 1) {
          const f = el.querySelector("#s1");
          data.siteName = f.siteName.value;
          data.tagline = f.tagline.value;
          data.logoId = Number(f.logoId.value || 0);
          data.faviconId = Number(f.faviconId.value || 0);
          data.heroTitle = f.heroTitle.value;
          data.heroSubtitle = f.heroSubtitle.value;
        }
        step += 1;
        paint();
      });
      el.querySelector("#prev")?.addEventListener("click", () => { step -= 1; paint(); });
      el.querySelector("#apply")?.addEventListener("click", async () => {
        data.ctaText = el.querySelector("#ctaText").value;
        data.ctaUrl = el.querySelector("#ctaUrl").value;
        try {
          await api.post("/onboard", data);
          toast("Identidad aplicada al sitio público");
          location.href = `${cfg.admin}?page=krg`;
        } catch (e) {
          toast(e.message);
        }
      });
    };
    paint();
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  async function pages() {
    if (view === "new") return newPage();
    if (view === "templates") return templates();
    if (view === "globals") return globals();
    const list = await api.get("/pages");
    const front = list.find((p) => p.isFront);
    const canPub = cfg.canPublish !== false;
    shell("pages", `
      <div class="m-top"><h1>Páginas</h1>
        <div class="m-row">
          <a class="m-btn" href="${cfg.admin}?page=krg-pages&view=new">Nueva página</a>
          <button class="m-btn ghost" id="exp-pages">Exportar JSON</button>
          <label class="m-btn ghost">Importar JSON <input type="file" id="imp-pages" accept="application/json" hidden></label>
        </div>
      </div>
      <div class="m-panel m-front-bar">
        <h2>Portada del sitio</h2>
        <p class="m-muted">Lo que ve quien entra a la web. Los borradores (como una página a medias) no se muestran aquí.</p>
        <div class="m-front-row">
          <label class="m-field">Página de inicio
            <select id="site-front">
              <option value="0">Últimas entradas del blog</option>
              ${list.map((p) => `<option value="${p.id}" ${p.isFront ? "selected" : ""} ${p.uiStatus !== "publish" && p.status !== "private" ? "disabled" : ""}>${esc(p.title)}${p.uiStatus !== "publish" && p.status !== "private" ? " (borrador)" : ""}</option>`).join("")}
            </select>
          </label>
          <button type="button" class="m-btn" id="save-front" ${canPub ? "" : "disabled"}>Usar como portada</button>
        </div>
        <p class="m-muted">${front ? `Ahora mismo la portada es «${esc(front.title)}».` : "Ahora mismo no hay una página de inicio: se muestran las entradas."}</p>
      </div>
      <div class="m-table"><table>
        <thead><tr><th>Título</th><th>Slug</th><th>Estado</th><th>Visibilidad</th><th>Portada</th><th></th></tr></thead>
        <tbody>
          ${list.map((p) => `<tr data-row="${p.id}">
            <td><a href="${cfg.admin}?page=krg-builder&id=${p.id}">${esc(p.title)}</a>
              ${p.isFront ? `<span class="m-pill pub">Portada</span>` : ""}</td>
            <td>/${esc(p.slug)}</td>
            <td>
              <select data-status ${canPub ? "" : "disabled"}>
                <option value="draft" ${p.uiStatus === "draft" ? "selected" : ""}>Borrador</option>
                <option value="pending" ${p.uiStatus === "pending" ? "selected" : ""}>Pendiente de revisión</option>
                <option value="publish" ${p.uiStatus === "publish" ? "selected" : ""}>Publicada</option>
              </select>
            </td>
            <td>
              <select data-vis ${canPub ? "" : "disabled"}>
                <option value="public" ${p.visibility === "public" ? "selected" : ""}>Público</option>
                <option value="protected" ${p.visibility === "protected" ? "selected" : ""}>Protegido con contraseña</option>
                <option value="private" ${p.visibility === "private" ? "selected" : ""}>Privada</option>
              </select>
              <input data-pw type="password" placeholder="${p.hasPassword ? "Nueva contraseña" : "Contraseña"}" autocomplete="new-password" ${p.visibility === "protected" ? "" : "hidden"}>
            </td>
            <td>${p.isFront ? `<span class="m-pill pub">Sí</span>` : `<button type="button" class="m-btn ghost" data-front="${p.id}" ${canPub ? "" : "disabled"}>Usar como portada</button>`}</td>
            <td>
              <a href="${cfg.admin}?page=krg-builder&id=${p.id}">Editar</a>
              · <button class="m-btn ghost" data-dup="${p.id}">Duplicar</button>
              · <button class="m-btn ghost" data-del="${p.id}">Eliminar</button>
            </td>
          </tr>`).join("")}
        </tbody>
      </table></div>`);
    const saveMeta = async (row, extra = {}) => {
      const id = row.getAttribute("data-row");
      const payload = {
        status: row.querySelector("[data-status]").value,
        visibility: row.querySelector("[data-vis]").value,
        ...extra,
      };
      const pw = row.querySelector("[data-pw]")?.value;
      if (payload.visibility === "protected" && pw) payload.password = pw;
      try {
        await api.post(`/pages/${id}/settings`, payload);
        toast("Página actualizada");
        pages();
      } catch (err) {
        toast(err.message);
      }
    };
    el.querySelectorAll("[data-status]").forEach((s) => s.onchange = () => saveMeta(s.closest("tr")));
    el.querySelectorAll("[data-vis]").forEach((s) => {
      s.onchange = () => {
        const pw = s.closest("tr").querySelector("[data-pw]");
        if (pw) pw.hidden = s.value !== "protected";
        if (s.value === "protected" && pw && !pw.value) {
          pw.focus();
          return;
        }
        saveMeta(s.closest("tr"));
      };
    });
    el.querySelectorAll("[data-pw]").forEach((inp) => {
      inp.onchange = () => {
        if (inp.closest("tr").querySelector("[data-vis]").value === "protected") saveMeta(inp.closest("tr"));
      };
    });
    el.querySelectorAll("[data-front]").forEach((b) => b.onclick = async () => {
      try {
        await api.post("/site/front", { pageId: Number(b.dataset.front) });
        toast("Portada actualizada");
        pages();
      } catch (err) {
        toast(err.message);
      }
    });
    el.querySelector("#save-front").onclick = async () => {
      try {
        await api.post("/site/front", { pageId: Number(el.querySelector("#site-front").value) });
        toast("Portada actualizada");
        pages();
      } catch (err) {
        toast(err.message);
      }
    };
    el.querySelectorAll("[data-dup]").forEach((b) => b.onclick = async () => {
      const d = await api.post(`/pages/${b.dataset.dup}/duplicate`, {});
      location.href = `${cfg.admin}?page=krg-builder&id=${d.id}`;
    });
    el.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
      if (!confirm("¿Eliminar esta página?")) return;
      await api.del(`/pages/${b.dataset.del}`);
      toast("Página eliminada");
      pages();
    });
    el.querySelector("#exp-pages").onclick = async () => {
      const pack = await api.post("/export", {});
      const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "krg-export.json";
      a.click();
    };
    el.querySelector("#imp-pages").onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const pack = JSON.parse(await file.text());
        const r = await api.post("/import", pack);
        toast("Importado. Páginas nuevas: " + (r.pages ?? 0));
        pages();
      } catch (err) {
        toast(err.message);
      }
    };
  }

  async function newPage() {
    const pages = await api.get("/pages").catch(() => []);
    shell("pages", `
      <div class="m-top"><h1>Nueva página</h1></div>
      <form class="m-form-grid" id="np">
        <label class="m-field">Nombre <input name="title" required placeholder="Página Servicios"></label>
        <label class="m-field">Slug <input name="slug" placeholder="servicios"></label>
        <label class="m-field">Página padre
          <select name="parentId">
            <option value="0">— Ninguna (raíz) —</option>
            ${pages.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join("")}
          </select>
        </label>
        <button class="m-btn" type="submit">Crear y abrir constructor</button>
      </form>`);
    el.querySelector("#np").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const doc = await api.post("/pages", { title: fd.get("title"), slug: fd.get("slug"), parentId: Number(fd.get("parentId") || 0) });
      location.href = `${cfg.admin}?page=krg-builder&id=${doc.id}`;
    };
  }

  async function templates() {
    const list = await api.get("/templates");
    shell("templates", `
      <div class="m-top"><h1>Plantillas</h1></div>
      <p class="m-muted">Guarda una sección desde el constructor con “Guardar plantilla”.</p>
      <div class="m-table"><table><tbody>
        ${list.length ? list.map((t) => `<tr><td>${esc(t.name)}</td><td><button class="m-btn ghost" data-del="${t.id}">Eliminar</button></td></tr>`).join("") : "<tr><td>No hay plantillas todavía.</td></tr>"}
      </tbody></table></div>`);
    el.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
      await api.del(`/templates/${b.dataset.del}`);
      templates();
    });
  }

  async function globals() {
    const list = await api.get("/globals");
    shell("globals", `
      <div class="m-top"><h1>Componentes globales</h1></div>
      <p class="m-muted">Un global se reutiliza en varias páginas. Editarlo afecta a todas las instancias.</p>
      <div class="m-table"><table><tbody>
        ${list.length ? list.map((t) => `<tr><td>${esc(t.name)}</td><td><button class="m-btn ghost" data-del="${t.id}">Eliminar</button></td></tr>`).join("") : "<tr><td>Ninguno todavía.</td></tr>"}
      </tbody></table></div>`);
    el.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
      await api.del(`/globals/${b.dataset.del}`);
      globals();
    });
  }

  function tokenMap(obj, prefix) {
    return Object.entries(obj || {}).map(([k, v]) => {
      const val = v && typeof v === "object" && "value" in v ? v.value : (typeof v === "object" ? JSON.stringify(v) : v);
      const label = (v && v.label) || k;
      return `<div class="m-field-row" style="grid-template-columns:160px 1fr">
        <span>${esc(label)}</span>
        <input data-tok="${prefix}.${k}" value="${esc(val ?? "")}">
      </div>`;
    }).join("");
  }

  function typeRows(typo) {
    return Object.entries(typo || {}).map(([role, item]) => `
      <div class="m-panel" style="padding:12px 16px;margin-bottom:10px">
        <strong>${esc(role)}</strong>
        <div class="m-field-row" style="grid-template-columns:repeat(4,1fr);margin-top:8px">
          <label class="m-field">Size <input data-typo="${role}" data-k="fontSize" value="${esc(item.fontSize || "")}"></label>
          <label class="m-field">Peso <input data-typo="${role}" data-k="fontWeight" value="${esc(item.fontWeight || "")}"></label>
          <label class="m-field">Interlineado <input data-typo="${role}" data-k="lineHeight" value="${esc(item.lineHeight || "")}"></label>
          <label class="m-field">Tracking <input data-typo="${role}" data-k="letterSpacing" value="${esc(item.letterSpacing || "")}"></label>
        </div>
      </div>`).join("");
  }

  async function design() {
    const pack = await api.get("/tokens");
    const data = pack.data || pack;
    const tokens = data.tokens || {};
    const identity = await api.get("/identity");
    const colorRows = Object.entries(tokens.color || {}).map(([k, v]) => {
      const val = v.value || v;
      return `<div class="m-field-row">
        <span>${esc(v.label || k)}</span>
        <input data-color="${k}" value="${esc(val)}">
        <input class="m-color" type="color" data-color-picker="${k}" value="${esc(normalizeHex(val))}">
      </div>`;
    }).join("");
    shell("design", `
      <div class="m-top"><h1>Apariencia</h1>
        <div class="m-row">
          ${(pack.presets || []).map((p) => `<button class="m-btn ghost" data-preset="${p.slug}">Activar ${esc(p.name)}</button>`).join("")}
          <button class="m-btn" id="save-tokens">Guardar tokens</button>
          <button class="m-btn ghost" id="exp-tokens">Exportar tokens</button>
          <label class="m-btn ghost">Importar tokens <input type="file" id="imp-tokens" accept="application/json" hidden></label>
        </div>
      </div>
      <div class="m-panel" style="padding:20px;margin-bottom:16px">
        <h3>Identidad</h3>
        <form class="m-form-grid" id="idform">
          <label class="m-field">Nombre del sitio <input name="siteName" value="${esc(identity.siteName)}"></label>
          <label class="m-field">Eslogan <input name="tagline" value="${esc(identity.tagline)}"></label>
          <label class="m-field">Logo
            <input name="logoId" type="hidden" value="${identity.logoId||0}">
            <div class="m-media-row">
              ${identity.logoUrl ? `<img class="m-thumb m-thumb-logo" src="${esc(identity.logoUrl)}" alt="Logo">` : `<span class="m-thumb m-thumb-empty">Sin logo</span>`}
              <button type="button" class="m-btn ghost" id="pick-logo">Elegir logo</button>
            </div>
          </label>
          <label class="m-field">Favicon (icono de pestaña)
            <input name="faviconId" type="hidden" value="${identity.faviconId||0}">
            <div class="m-media-row">
              ${identity.faviconUrl ? `<img class="m-thumb m-thumb-fav" src="${esc(identity.faviconUrl)}" alt="Favicon">` : `<span class="m-thumb m-thumb-empty">32×32</span>`}
              <button type="button" class="m-btn ghost" id="pick-fav">Elegir favicon</button>
            </div>
            <small class="m-muted">PNG cuadrado (32×32 o 512×512). Aparece en la pestaña del navegador.</small>
          </label>
          <button class="m-btn" type="submit">Guardar identidad</button>
        </form>
      </div>
      <div class="m-panel" style="padding:20px;margin-bottom:16px">
        <h3>Colores</h3>
        <p class="m-muted">Alimentan var(--color-*). Ningún componente usa hex de marca.</p>
        <div id="colors">${colorRows}</div>
      </div>
      <div class="m-panel" style="padding:20px;margin-bottom:16px">
        <h3>Familias tipográficas</h3>
        ${Object.entries(tokens.font || {}).map(([k,v]) => `<label class="m-field">${esc(v.label||k)} <input data-font="${k}" value="${esc(v.value||v)}"></label>`).join("")}
      </div>
      <h3>Roles tipográficos</h3>
      ${typeRows(tokens.typography)}
      <div class="m-panel" style="padding:20px;margin-bottom:16px">
        <h3>Espaciado</h3>${tokenMap(tokens.spacing, "spacing")}
      </div>
      <div class="m-panel" style="padding:20px;margin-bottom:16px">
        <h3>Radios</h3>${tokenMap(tokens.radius, "radius")}
      </div>
      <div class="m-panel" style="padding:20px;margin-bottom:16px">
        <h3>Sombras</h3>${tokenMap(tokens.shadow, "shadow")}
      </div>
      <div class="m-panel" style="padding:20px;margin-bottom:16px">
        <h3>Layout</h3>${tokenMap(tokens.layout, "layout")}
      </div>
      <div class="m-panel" style="padding:20px;margin-bottom:16px">
        <h3>Breakpoints</h3>${tokenMap(tokens.breakpoint, "breakpoint")}
      </div>`);
    el.querySelectorAll("[data-color]").forEach((inp) => {
      const p = el.querySelector(`[data-color-picker="${inp.dataset.color}"]`);
      inp.oninput = () => { if (p && /^#[0-9a-fA-F]{6}$/.test(inp.value)) p.value = inp.value; };
      if (p) p.oninput = () => { inp.value = p.value; };
    });
    const collect = () => {
      const next = structuredClone(data);
      el.querySelectorAll("[data-color]").forEach((inp) => {
        next.tokens.color[inp.dataset.color].value = inp.value;
      });
      el.querySelectorAll("[data-font]").forEach((inp) => {
        next.tokens.font[inp.dataset.font].value = inp.value;
      });
      el.querySelectorAll("[data-typo]").forEach((inp) => {
        next.tokens.typography = next.tokens.typography || {};
        next.tokens.typography[inp.dataset.typo] = next.tokens.typography[inp.dataset.typo] || {};
        next.tokens.typography[inp.dataset.typo][inp.dataset.k] = inp.value;
      });
      el.querySelectorAll("[data-tok]").forEach((inp) => {
        const [group, key] = inp.dataset.tok.split(".");
        next.tokens[group] = next.tokens[group] || {};
        if (next.tokens[group][key] && typeof next.tokens[group][key] === "object") {
          next.tokens[group][key].value = inp.value;
        } else {
          next.tokens[group][key] = { value: inp.value };
        }
      });
      return next;
    };
    el.querySelector("#save-tokens").onclick = async () => {
      await api.put("/tokens", collect());
      toast("Tokens guardados. El sitio público ya usa los nuevos valores.");
    };
    el.querySelector("#exp-tokens").onclick = async () => {
      const pack = collect();
      const blob = new Blob([JSON.stringify({ krg: 1, tokens: pack }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "krg-tokens.json";
      a.click();
    };
    el.querySelector("#imp-tokens").onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const pack = JSON.parse(await file.text());
        const tokens = pack.tokens || pack;
        await api.put("/tokens", tokens);
        toast("Tokens importados");
        design();
      } catch (err) {
        toast(err.message);
      }
    };
    el.querySelectorAll("[data-preset]").forEach((b) => b.onclick = async () => {
      await api.post(`/tokens/presets/${b.dataset.preset}/activate`, {});
      toast("Preset activado");
      design();
    });
    const picker = (btnId, inputName, title) => {
      const pick = el.querySelector(btnId);
      if (pick && window.wp?.media) {
        pick.onclick = () => {
          const frame = wp.media({ title, multiple: false, library: { type: "image" } });
          frame.on("select", () => {
            const att = frame.state().get("selection").first().toJSON();
            el.querySelector(`[name=${inputName}]`).value = att.id;
            const img = pick.parentElement.querySelector("img, .m-thumb-empty");
            if (img && img.tagName === "IMG") img.src = att.url;
            else if (img) {
              const n = document.createElement("img");
              n.className = inputName === "faviconId" ? "m-thumb m-thumb-fav" : "m-thumb m-thumb-logo";
              n.src = att.url;
              img.replaceWith(n);
            }
          });
          frame.open();
        };
      }
    };
    picker("#pick-logo", "logoId", "Logo");
    picker("#pick-fav", "faviconId", "Favicon");
    el.querySelector("#idform").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await api.put("/identity", {
        siteName: fd.get("siteName"),
        tagline: fd.get("tagline"),
        logoId: Number(fd.get("logoId") || 0),
        faviconId: Number(fd.get("faviconId") || 0),
      });
      toast("Identidad y favicon guardados. Recarga el sitio para ver la pestaña.");
    };
  }

  function normalizeHex(v) {
    return /^#[0-9a-fA-F]{6}$/.test(v) ? v : "#000000";
  }

  async function navigation() {
    const [menus, header, footer, pages] = await Promise.all([
      api.get("/menus"), api.get("/header"), api.get("/footer"), api.get("/pages"),
    ]);
    const menuState = {};
    menus.forEach((m) => { menuState[m.slug] = structuredClone(m.items || []); });
    const socialLines = (footer.social || []).map((s) => `${s.label || ""}|${s.url || ""}`).join("\n");
    shell("nav", `
      <div class="m-top"><h1>Header, footer y menús</h1>
        <div class="m-row">
          <a class="m-btn ghost" href="${cfg.admin}?page=krg-builder&chrome=header">Constructor visual</a>
          <button class="m-btn" id="save-nav">Guardar</button>
        </div>
      </div>
      <p class="m-muted">Los cambios se aplican al sitio público al guardar. El iframe muestra la home real.</p>
      <div class="m-panel" style="padding:0;margin-bottom:16px;overflow:hidden">
        <iframe title="Preview" src="${cfg.home}" style="width:100%;height:280px;border:0;background:#fff"></iframe>
      </div>
      <div class="m-panel" style="padding:20px;margin-bottom:16px">
        <h3>Header</h3>
        <div class="m-field-row" style="grid-template-columns:1fr 1fr 1fr">
          <label class="m-field">CTA <input id="ctaText" value="${esc(header.ctaText||"")}"></label>
          <label class="m-field">URL CTA <input id="ctaUrl" value="${esc(header.ctaUrl||"")}"></label>
          <label class="m-field">Menú
            <select id="hMenu">${menus.map((m)=>`<option value="${m.slug}" ${header.menuSlug===m.slug?"selected":""}>${esc(m.name||m.slug)}</option>`).join("")}</select>
          </label>
        </div>
        <div class="m-field-row" style="grid-template-columns:repeat(4,1fr)">
          <label class="m-field">Alto (px) <input type="number" id="hHeight" value="${header.height||72}"></label>
          <label class="m-field">Padding Y <input type="number" id="hPad" value="${header.paddingY||12}"></label>
          <label class="m-field">Ancho logo <input type="number" id="logoWidth" value="${header.logoWidth||140}"></label>
          <label class="m-field">Alineación
            <select id="hAlign"><option value="left" ${header.align!=="center"?"selected":""}>Izquierda</option><option value="center" ${header.align==="center"?"selected":""}>Centro</option></select>
          </label>
        </div>
        <div class="m-field-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
          <label class="m-field">Fondo <input id="hBg" value="${esc(header.background||"")}" placeholder="var(--color-background)"></label>
          <label class="m-field">Color texto <input id="hFg" value="${esc(header.color||"")}"></label>
          <label class="m-field">Logo ID <input type="number" id="hLogo" value="${header.logoId||0}"></label>
          <label class="m-field">Logo mobile ID <input type="number" id="hLogoM" value="${header.logoMobile||0}"></label>
        </div>
        <label class="m-field">Sticky <input type="checkbox" id="sticky" ${header.sticky?"checked":""}></label>
        <label class="m-field">Transparente <input type="checkbox" id="hTrans" ${header.transparent?"checked":""}></label>
      </div>
      ${menus.map((m) => `
        <div class="m-panel" style="padding:20px;margin-bottom:16px">
          <h3>Menú ${esc(m.name || m.slug)}</h3>
          <div data-menu="${m.slug}"></div>
          <button class="m-btn ghost" data-add-menu="${m.slug}">Añadir enlace</button>
        </div>`).join("")}
      <div class="m-panel" style="padding:20px">
        <h3>Footer</h3>
        <label class="m-field">Texto <textarea id="ft">${esc(footer.text||"")}</textarea></label>
        <label class="m-field">Copyright <input id="copy" value="${esc(footer.copyright||"")}"></label>
        <div class="m-field-row" style="grid-template-columns:1fr 1fr 1fr">
          <label class="m-field">Columnas <input type="number" id="fCols" min="1" max="4" value="${footer.columns||3}"></label>
          <label class="m-field">Padding Y <input type="number" id="fPad" value="${footer.paddingY||64}"></label>
          <label class="m-field">Logo ID <input type="number" id="fLogo" value="${footer.logoId||0}"></label>
        </div>
        <div class="m-field-row" style="grid-template-columns:1fr 1fr">
          <label class="m-field">Fondo <input id="fBg" value="${esc(footer.background||"")}"></label>
          <label class="m-field">Color <input id="fFg" value="${esc(footer.color||"")}"></label>
        </div>
        <label class="m-field">Columna extra (título) <input id="fExT" value="${esc(footer.extraTitle||"")}"></label>
        <label class="m-field">Columna extra (texto) <textarea id="fExB">${esc(footer.extraText||"")}</textarea></label>
        <label class="m-field">Redes (una por línea: Nombre|https://…) <textarea id="fSoc">${esc(socialLines)}</textarea></label>
        <label class="m-field">Mostrar buscador <input type="checkbox" id="fSearch" ${footer.showSearch?"checked":""}></label>
        <label class="m-field">Menú footer
          <select id="fMenu">${menus.map((m)=>`<option value="${m.slug}" ${footer.menuSlug===m.slug?"selected":""}>${esc(m.name||m.slug)}</option>`).join("")}</select>
        </label>
      </div>`);
    const renderItems = (slug) => {
      const box = el.querySelector(`[data-menu="${slug}"]`);
      if (!box) return;
      const items = menuState[slug] || [];
      box.innerHTML = items.map((it, i) => `
        <div class="m-field-row" style="grid-template-columns:1fr 1fr 1fr 70px 40px;margin-bottom:8px">
          <input data-slug="${slug}" data-i="${i}" data-k="label" value="${esc(it.label)}">
          <select data-slug="${slug}" data-i="${i}" data-k="pageId">
            <option value="0">URL externa</option>
            ${pages.map((p) => `<option value="${p.id}" ${Number(it.pageId)===p.id?"selected":""}>${esc(p.title)}</option>`).join("")}
          </select>
          <input data-slug="${slug}" data-i="${i}" data-k="url" placeholder="https://" value="${esc(it.url||"")}">
          <label style="font-weight:400;font-size:12px"><input type="checkbox" data-slug="${slug}" data-i="${i}" data-k="visible" ${it.visible!==false?"checked":""}> visible</label>
          <button class="m-btn ghost" data-rm-slug="${slug}" data-rm="${i}">×</button>
        </div>`).join("");
      box.querySelectorAll("input,select").forEach((inp) => {
        inp.onchange = () => {
          const arr = menuState[inp.dataset.slug];
          const i = Number(inp.dataset.i);
          const k = inp.dataset.k;
          if (k === "visible") arr[i][k] = inp.checked;
          else if (k === "pageId") {
            arr[i][k] = Number(inp.value);
            if (Number(inp.value)) arr[i].type = "internal";
          } else {
            arr[i][k] = inp.value;
            if (k === "url" && inp.value) arr[i].type = "external";
          }
        };
      });
      box.querySelectorAll("[data-rm]").forEach((b) => b.onclick = () => {
        menuState[b.dataset.rmSlug].splice(Number(b.dataset.rm), 1);
        renderItems(b.dataset.rmSlug);
      });
    };
    menus.forEach((m) => renderItems(m.slug));
    el.querySelectorAll("[data-add-menu]").forEach((b) => {
      b.onclick = () => {
        const slug = b.dataset.addMenu;
        menuState[slug] = menuState[slug] || [];
        menuState[slug].push({ id: uid("itm_"), label: "Nuevo", type: "internal", pageId: pages[0]?.id || 0, url: "", target: "_self", visible: true, children: [] });
        renderItems(slug);
      };
    });
    el.querySelector("#save-nav").onclick = async () => {
      const next = menus.map((m) => ({ ...m, items: menuState[m.slug] || [] }));
      await api.put("/menus", next);
      await api.put("/header", {
        ...header,
        ctaText: el.querySelector("#ctaText").value,
        ctaUrl: el.querySelector("#ctaUrl").value,
        sticky: el.querySelector("#sticky").checked,
        transparent: el.querySelector("#hTrans").checked,
        logoWidth: Number(el.querySelector("#logoWidth").value || 140),
        height: Number(el.querySelector("#hHeight").value || 72),
        paddingY: Number(el.querySelector("#hPad").value || 12),
        align: el.querySelector("#hAlign").value,
        background: el.querySelector("#hBg").value,
        color: el.querySelector("#hFg").value,
        logoId: Number(el.querySelector("#hLogo").value || 0),
        logoMobile: Number(el.querySelector("#hLogoM").value || 0),
        menuSlug: el.querySelector("#hMenu").value,
      });
      await api.put("/footer", {
        ...footer,
        text: el.querySelector("#ft").value,
        copyright: el.querySelector("#copy").value,
        columns: Number(el.querySelector("#fCols").value || 3),
        paddingY: Number(el.querySelector("#fPad").value || 64),
        logoId: Number(el.querySelector("#fLogo").value || 0),
        background: el.querySelector("#fBg").value,
        color: el.querySelector("#fFg").value,
        extraTitle: el.querySelector("#fExT").value,
        extraText: el.querySelector("#fExB").value,
        social: el.querySelector("#fSoc").value,
        showSearch: el.querySelector("#fSearch").checked,
        menuSlug: el.querySelector("#fMenu").value,
      });
      toast("Header, footer y menús guardados");
      const iframe = el.querySelector("iframe");
      if (iframe) iframe.src = cfg.home + (cfg.home.includes("?") ? "&" : "?") + "t=" + Date.now();
    };
  }

  async function blog() {
    if (view === "edit" && cfg.pageId) return blogEdit(cfg.pageId);
    const list = await api.get("/blog");
    shell("blog", `
      <div class="m-top"><h1>Blog</h1><button class="m-btn" id="np">Nueva entrada</button></div>
      <div class="m-table"><table>
        <thead><tr><th>Título</th><th>Estado</th><th></th></tr></thead>
        <tbody>${list.map((p)=>`<tr>
          <td><a href="${cfg.admin}?page=krg-blog&view=edit&id=${p.id}">${esc(p.title)}</a></td>
          <td><span class="m-pill ${p.status==="publish"?"pub":""}">${esc(p.status)}</span></td>
          <td><button class="m-btn ghost" data-del="${p.id}">Eliminar</button></td>
        </tr>`).join("")}</tbody>
      </table></div>`);
    el.querySelector("#np").onclick = async () => {
      const p = await api.post("/blog", { title: "Nueva entrada", status: "draft", content: "<p></p>" });
      location.href = `${cfg.admin}?page=krg-blog&view=edit&id=${p.id}`;
    };
    el.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
      if (!confirm("¿Eliminar esta entrada?")) return;
      await api.del(`/blog/${b.dataset.del}`);
      blog();
    });
  }

  async function blogEdit(id) {
    const [p, tax] = await Promise.all([api.get(`/blog/${id}`), api.get("/blog/taxonomies")]);
    shell("blog", `
      <div class="m-top"><h1>Editar entrada</h1>
        <div class="m-row">
          <button class="m-btn ghost" id="draft">Guardar borrador</button>
          <button class="m-btn" id="pub">Publicar</button>
        </div>
      </div>
      <form class="m-form-grid" id="be">
        <label class="m-field">Título <input name="title" value="${esc(p.title)}"></label>
        <label class="m-field">Subtítulo <input name="subtitle" value="${esc(p.subtitle)}"></label>
        <label class="m-field">Slug <input name="slug" value="${esc(p.slug)}"></label>
        <label class="m-field">Extracto <textarea name="excerpt">${esc(p.excerpt)}</textarea></label>
        <div class="m-field">
          <span>Contenido</span>
          <div class="m-toolbar" id="tb">
            <button type="button" data-w="p">P</button>
            <button type="button" data-w="h2">H2</button>
            <button type="button" data-w="h3">H3</button>
            <button type="button" data-w="strong">Negrita</button>
            <button type="button" data-w="em">Cursiva</button>
            <button type="button" data-w="blockquote">Cita</button>
            <button type="button" data-w="ul">Lista</button>
            <button type="button" data-w="a">Enlace</button>
            <button type="button" data-w="hr">Separador</button>
            <button type="button" id="img-in">Imagen</button>
          </div>
          <textarea name="content" id="content" style="min-height:240px">${esc(p.content)}</textarea>
        </div>
        <label class="m-field">Imagen destacada (ID) <input name="featuredImageId" type="number" value="${p.featuredImageId||0}">
          <button type="button" class="m-btn ghost" id="feat">Elegir</button></label>
        <label class="m-field">Categorías
          <select name="categories" multiple>${(tax.categories||[]).map(c=>`<option value="${c.id}" ${(p.categories||[]).includes(c.id)?"selected":""}>${esc(c.name)}</option>`).join("")}</select>
        </label>
        <label class="m-field">Etiquetas
          <select name="tags" multiple>${(tax.tags||[]).map(c=>`<option value="${c.id}" ${(p.tags||[]).includes(c.id)?"selected":""}>${esc(c.name)}</option>`).join("")}</select>
        </label>
        <label class="m-field">Nueva etiqueta <input id="newtag" placeholder="Nombre">
          <button type="button" class="m-btn ghost" id="addtag">Crear etiqueta</button></label>
        <label class="m-field">SEO title <input name="seoTitle" value="${esc(p.seo?.title||"")}"></label>
        <label class="m-field">Meta description <textarea name="seoDesc">${esc(p.seo?.description||"")}</textarea></label>
        <label class="m-field">Fecha (programar) <input type="datetime-local" name="date"></label>
      </form>`);
    const ta = el.querySelector("#content");
    const wrap = (open, close) => {
      const s = ta.selectionStart, e = ta.selectionEnd;
      const sel = ta.value.slice(s, e) || "texto";
      ta.setRangeText(`${open}${sel}${close}`, s, e, "end");
      ta.focus();
    };
    el.querySelectorAll("#tb [data-w]").forEach((b) => {
      b.onclick = () => {
        const t = b.dataset.w;
        if (t === "hr") return wrap("<hr>\n", "");
        if (t === "a") {
          const url = prompt("URL", "https://");
          if (!url) return;
          return wrap(`<a href="${url}">`, "</a>");
        }
        if (t === "ul") return wrap("<ul>\n<li>", "</li>\n</ul>");
        wrap(`<${t}>`, `</${t}>`);
      };
    });
    const media = (title, cb) => {
      if (!window.wp?.media) return;
      const frame = wp.media({ title, multiple: false });
      frame.on("select", () => cb(frame.state().get("selection").first().toJSON()));
      frame.open();
    };
    el.querySelector("#feat").onclick = () => media("Imagen destacada", (att) => {
      el.querySelector("[name=featuredImageId]").value = att.id;
    });
    el.querySelector("#img-in").onclick = () => media("Insertar imagen", (att) => {
      wrap(`<figure><img src="${att.url}" alt="${att.alt || ""}"></figure>\n`, "");
    });
    el.querySelector("#addtag").onclick = async () => {
      const name = el.querySelector("#newtag").value.trim();
      if (!name) return;
      const t = await api.post("/blog/terms", { name, taxonomy: "post_tag" });
      const sel = el.querySelector("[name=tags]");
      const opt = document.createElement("option");
      opt.value = t.id; opt.textContent = name; opt.selected = true;
      sel.appendChild(opt);
      el.querySelector("#newtag").value = "";
      toast("Etiqueta creada");
    };
    const payload = (status) => {
      const f = el.querySelector("#be");
      const cats = [...f.categories.selectedOptions].map((o) => Number(o.value));
      const tags = [...f.tags.selectedOptions].map((o) => Number(o.value));
      return {
        title: f.title.value,
        subtitle: f.subtitle.value,
        slug: f.slug.value,
        excerpt: f.excerpt.value,
        content: f.content.value,
        featuredImageId: Number(f.featuredImageId.value || 0),
        categories: cats,
        tags,
        status,
        date: f.date.value ? f.date.value.replace("T", " ") + ":00" : undefined,
        seo: { title: f.seoTitle.value, description: f.seoDesc.value },
      };
    };
    el.querySelector("#draft").onclick = async () => { await api.put(`/blog/${id}`, payload("draft")); toast("Borrador guardado"); };
    el.querySelector("#pub").onclick = async () => { await api.put(`/blog/${id}`, payload("publish")); toast("Publicada"); };
  }

  async function seo() {
    const s = await api.get("/seo");
    const robotsOpts = ["index,follow", "noindex,follow", "index,nofollow", "noindex,nofollow"];
    shell("seo", `
      <div class="m-top"><h1>SEO global</h1></div>
      <form class="m-form-grid" id="sf">
        <label class="m-field">Separador del título <input name="separator" value="${esc(s.separator||"|")}"></label>
        <label class="m-field">Robots por defecto
          <select name="robots">${robotsOpts.map((o) => `<option value="${o}" ${(s.robots||"index,follow")===o?"selected":""}>${o}</option>`).join("")}</select>
        </label>
        <label class="m-field">Twitter / X (@usuario) <input name="twitter" value="${esc(s.twitter||"")}" placeholder="marca"></label>
        <label class="m-field">Imagen Open Graph por defecto
          <input name="ogImageId" type="hidden" value="${s.ogImageId||0}">
          <div class="m-media-row">
            ${s.ogImageUrl ? `<img class="m-thumb m-thumb-logo" src="${esc(s.ogImageUrl)}" alt="OG">` : `<span class="m-thumb m-thumb-empty">1200×630</span>`}
            <button type="button" class="m-btn ghost" id="pick-og">Elegir imagen</button>
          </div>
          <small class="m-muted">Se usa cuando la página no tiene imagen OG propia.</small>
        </label>
        <button class="m-btn">Guardar SEO</button>
      </form>
      <div class="m-panel" style="padding:16px 20px;margin-top:16px">
        <h3>Archivos públicos</h3>
        <p><a href="${esc(s.sitemapUrl)}" target="_blank">${esc(s.sitemapUrl)}</a> — páginas y posts publicados (omite noindex).</p>
        <p><a href="${esc(s.robotsUrl)}" target="_blank">${esc(s.robotsUrl)}</a></p>
        <p class="m-muted">Por página: constructor → inspector (sin seleccionar un bloque) → Título SEO, description, robots, imagen OG.</p>
      </div>`);
    const pick = el.querySelector("#pick-og");
    if (pick && window.wp?.media) {
      pick.onclick = () => {
        const frame = wp.media({ title: "Imagen Open Graph", multiple: false, library: { type: "image" } });
        frame.on("select", () => {
          const att = frame.state().get("selection").first().toJSON();
          el.querySelector("[name=ogImageId]").value = att.id;
          const slot = pick.parentElement.querySelector("img, .m-thumb-empty");
          if (slot && slot.tagName === "IMG") slot.src = att.url;
          else if (slot) {
            const n = document.createElement("img");
            n.className = "m-thumb m-thumb-logo";
            n.src = att.url;
            slot.replaceWith(n);
          }
        });
        frame.open();
      };
    }
    el.querySelector("#sf").onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      await api.put("/seo", {
        separator: f.separator.value,
        robots: f.robots.value,
        twitter: f.twitter.value,
        ogImageId: Number(f.ogImageId.value || 0),
      });
      toast("SEO global guardado. Ya está en el HTML público.");
    };
  }

  async function users() {
    const roles = [
      { id: "administrator", label: "Administrador" },
      { id: "editor", label: "Editor" },
      { id: "author", label: "Autor" },
      { id: "contributor", label: "Colaborador" },
      { id: "subscriber", label: "Suscriptor" },
    ];
    const roleOpts = (sel) => roles.map((r) => `<option value="${r.id}" ${sel===r.id?"selected":""}>${r.label}</option>`).join("");
    const [list, pack] = await Promise.all([api.get("/users"), api.get("/roles")]);
    let editing = null;
    const paint = (rows) => {
      const capHead = (pack.caps || []).map((c) => `<th>${esc(c.label)}</th>`).join("");
      const capRows = (pack.roles || []).map((r) => {
        const cells = (pack.caps || []).map((c) => {
          const on = (r.caps || []).includes(c.key);
          const lock = r.slug === "administrator" && c.key === "meridian_manage";
          return `<td><input type="checkbox" data-role="${r.slug}" data-cap="${c.key}" ${on?"checked":""} ${lock?"disabled":""}></td>`;
        }).join("");
        return `<tr><th>${esc(r.label)}</th>${cells}</tr>`;
      }).join("");
      shell("users", `
        <div class="m-top"><h1>Usuarios</h1></div>
        <p class="m-muted">Solo el administrador crea, edita y elimina cuentas. El rol define qué pueden hacer en KRG CMS.</p>
        <div class="m-table"><table>
          <thead><tr><th>Usuario</th><th>Nombre</th><th>Correo</th><th>Rol</th><th></th></tr></thead>
          <tbody>${rows.map((u) => `<tr>
            <td><code>${esc(u.login)}</code>${u.isYou ? " <span class=\"m-pill\">tú</span>" : ""}</td>
            <td>${esc(u.name)}</td>
            <td>${esc(u.email)}</td>
            <td>${esc(u.roleLabel)}</td>
            <td>
              <button class="m-btn ghost" data-ed="${u.id}">Editar</button>
              ${u.isYou ? "" : `· <button class="m-btn ghost" data-del="${u.id}">Eliminar</button>`}
            </td>
          </tr>`).join("")}</tbody>
        </table></div>
        <div class="m-panel" style="padding:20px;margin-top:20px">
          <h3>${editing ? "Editar cuenta" : "Nueva cuenta"}</h3>
          <form class="m-form-grid" id="uf">
            <label class="m-field">Usuario (login) <input name="login" required minlength="3" value="${esc(editing?.login || "")}" ${editing?" ":" "}></label>
            <label class="m-field">Nombre para mostrar <input name="name" value="${esc(editing?.name || "")}"></label>
            <label class="m-field">Correo <input name="email" type="email" required value="${esc(editing?.email || "")}"></label>
            <label class="m-field">Rol <select name="role">${roleOpts(editing?.role || "author")}</select></label>
            <label class="m-field">${editing ? "Nueva contraseña (vacío = no cambiar)" : "Contraseña"}
              <input name="password" type="password" autocomplete="new-password" ${editing ? "" : "required minlength=\"8\""} placeholder="${editing ? "••••••••" : "mínimo 8 caracteres"}">
            </label>
            <div class="m-row">
              <button class="m-btn" type="submit">${editing ? "Guardar cambios" : "Crear cuenta"}</button>
              ${editing ? `<button type="button" class="m-btn ghost" id="cancel">Cancelar</button>` : ""}
            </div>
          </form>
        </div>
        <div class="m-panel" style="padding:20px;margin-top:20px">
          <h3>Permisos por rol</h3>
          <p class="m-muted">Aplica a todas las cuentas con ese rol. El administrador no puede perder «Tokens / usuarios».</p>
          <div class="m-table" style="overflow:auto"><table>
            <thead><tr><th>Rol</th>${capHead}</tr></thead>
            <tbody>${capRows}</tbody>
          </table></div>
          <button class="m-btn" type="button" id="save-roles" style="margin-top:12px">Guardar permisos</button>
        </div>`);
      el.querySelectorAll("[data-ed]").forEach((b) => {
        b.onclick = () => { editing = rows.find((x) => String(x.id) === b.dataset.ed); paint(rows); };
      });
      el.querySelectorAll("[data-del]").forEach((b) => {
        b.onclick = async () => {
          if (!confirm("¿Eliminar esta cuenta? Sus entradas pasarán a tu usuario.")) return;
          try {
            await api.del(`/users/${b.dataset.del}`);
            toast("Cuenta eliminada");
            users();
          } catch (e) { toast(e.message); }
        };
      });
      el.querySelector("#cancel")?.addEventListener("click", () => { editing = null; paint(rows); });
      el.querySelector("#save-roles")?.addEventListener("click", async () => {
        const next = (pack.roles || []).map((r) => {
          const caps = [...el.querySelectorAll(`[data-role="${r.slug}"]:checked`)].map((i) => i.dataset.cap);
          if (r.slug === "administrator" && !caps.includes("meridian_manage")) caps.push("meridian_manage");
          return { slug: r.slug, caps };
        });
        try {
          const saved = await api.put("/roles", { roles: next });
          pack.roles = saved.roles || next;
          toast("Permisos de rol guardados. Las cuentas ya los usan.");
        } catch (err) {
          toast(err.message);
        }
      });
      el.querySelector("#uf").onsubmit = async (e) => {
        e.preventDefault();
        const f = e.target;
        const body = {
          login: f.login.value.trim(),
          name: f.name.value.trim() || f.login.value.trim(),
          email: f.email.value.trim(),
          role: f.role.value,
          password: f.password.value,
        };
        try {
          if (editing) {
            if (!body.password) delete body.password;
            await api.put(`/users/${editing.id}`, body);
            toast("Usuario guardado" + (editing.isYou && body.password ? ". Si cambiaste tu contraseña, vuelve a entrar." : ""));
          } else {
            await api.post("/users", body);
            toast("Cuenta creada");
          }
          users();
        } catch (err) {
          toast(err.message);
        }
      };
    };
    paint(list);
  }

  async function settings() {
    const s = await api.get("/settings");
    const rows = (s.caps || []).map((c) => `<tr>
      <td>${esc(c.role)}</td>
      <td>${c.manage ? "sí" : "no"}</td>
      <td>${c.pages ? "sí" : "no"}</td>
      <td>${c.publish ? "sí" : "no"}</td>
      <td>${esc(c.blog)}</td>
    </tr>`).join("");
    shell("settings", `
      <div class="m-top"><h1>Configuración</h1></div>
      <label class="m-field">Modo debug <input type="checkbox" id="dbg" ${s.debug?"checked":""}></label>
      <p class="m-muted">El debug escribe logs técnicos. Nunca se muestran al visitante.</p>
      <div class="m-row">
        <button class="m-btn" id="sv">Guardar</button>
        <button class="m-btn ghost" id="exp">Exportar JSON</button>
        <label class="m-btn ghost">Importar JSON <input type="file" id="imp" accept="application/json" hidden></label>
      </div>
      <div class="m-panel" style="padding:16px 20px;margin-top:20px">
        <h3>Caché</h3>
        <p class="m-muted">Si guardas o publicas y la web no muestra el cambio, borra la caché. No se eliminan páginas ni borradores.</p>
        <button class="m-btn" type="button" id="flush-cache">Borrar caché</button>
        <p class="m-muted" id="flush-msg" hidden></p>
      </div>
      <div class="m-panel" style="padding:16px 20px;margin-top:20px">
        <h3>Permisos</h3>
        <p class="m-muted">Las rutas REST comprueban caps, no “está logueado”. El autor no puede cambiar tokens.</p>
        <table class="m-table"><thead><tr><th>Rol</th><th>Tokens / chrome</th><th>Páginas</th><th>Publicar</th><th>Blog</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <p class="m-muted">Usuario de prueba autor: <code>autor</code> / <code>autor123</code></p>
      </div>`);
    el.querySelector("#sv").onclick = async () => {
      await api.put("/settings", { debug: el.querySelector("#dbg").checked });
      toast("Guardado");
    };
    el.querySelector("#flush-cache").onclick = async () => {
      const btn = el.querySelector("#flush-cache");
      const msg = el.querySelector("#flush-msg");
      btn.disabled = true;
      try {
        const r = await api.post("/cache/flush", {});
        if (msg) {
          msg.hidden = false;
          msg.textContent = r.message || "Caché borrada.";
        }
        toast(r.message || "Caché borrada");
      } catch (err) {
        toast(err.message || "No se pudo borrar la caché");
      }
      btn.disabled = false;
    };
    el.querySelector("#exp").onclick = async () => {
      const pack = await api.post("/export", {});
      const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "krg-export.json";
      a.click();
    };
    el.querySelector("#imp").onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const pack = JSON.parse(await file.text());
        const r = await api.post("/import", pack);
        toast("Paquete importado. Páginas nuevas: " + (r.pages ?? 0));
      } catch (err) {
        toast(err.message);
      }
    };
  }

  const routes = {
    krg: home,
    "krg-pages": pages,
    "krg-blog": blog,
    "krg-design": design,
    "krg-nav": navigation,
    "krg-seo": seo,
    "krg-users": users,
    "krg-settings": settings,
  };
  const run = routes[pageKey];
  if (run) {
    run().catch((e) => {
      shell("home", `<p class="m-form-error">${esc(e.message)}</p>`);
    });
  }
})();
