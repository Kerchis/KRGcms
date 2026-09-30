(() => {
  const cfg = window.KrgAdmin || {};
  const api = window.MApi;
  const root = document.getElementById("krg-builder");
  if (!root || !api) return;
  const start = cfg.chrome === "footer" ? "footer" : "header";

  const state = {
    region: start,
    header: null,
    footer: null,
    menus: [],
    save: "Guardado",
    dirty: false,
    timer: null,
    bp: "desktop",
    shell: false,
    undo: [],
    redo: [],
    history: [],
    last: "",
    widths: { desktop: "100%", tablet: "768px", mobile: "390px" },
  };

  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const toast = (t) => {
    const n = document.createElement("div");
    n.className = "m-toast";
    n.textContent = t;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2200);
  };

  function pack() {
    return JSON.stringify({ header: state.header, footer: state.footer });
  }
  function applyPack(raw) {
    const s = JSON.parse(raw);
    state.header = s.header;
    state.footer = s.footer;
  }
  function pushHistory(label) {
    state.history.unshift({
      at: new Date().toISOString().replace("T", " ").slice(0, 19),
      label,
      data: pack(),
    });
    if (state.history.length > 30) state.history.pop();
  }
  function markDirty() {
    const now = pack();
    if (state.last && state.last !== now) {
      state.undo.push(state.last);
      if (state.undo.length > 50) state.undo.shift();
      state.redo = [];
    }
    state.last = now;
    state.dirty = true;
    state.save = "Sin guardar";
    paint();
    clearTimeout(state.timer);
    state.timer = setTimeout(save, 1000);
  }
  function undo() {
    if (!state.undo.length) return;
    state.redo.push(pack());
    applyPack(state.undo.pop());
    state.last = pack();
    state.dirty = true;
    state.save = "Sin guardar";
    paintChrome();
    clearTimeout(state.timer);
    state.timer = setTimeout(save, 1200);
  }
  function redo() {
    if (!state.redo.length) return;
    state.undo.push(pack());
    applyPack(state.redo.pop());
    state.last = pack();
    state.dirty = true;
    state.save = "Sin guardar";
    paintChrome();
    clearTimeout(state.timer);
    state.timer = setTimeout(save, 1200);
  }
  function openHistory() {
    const wrap = document.createElement("div");
    wrap.className = "confirm";
    wrap.innerHTML = `<div class="box" style="width:min(520px,92vw);max-height:80vh;overflow:auto">
      <h3>Historial</h3>
      <p class="m-muted">Restaura un estado guardado o cargado en esta sesión. Luego se autoguarda.</p>
      <ul class="b-rev">
        ${(state.history || []).map((r, i) => `<li>
          <span>${esc(r.at)} · ${esc(r.label)}</span>
          <button class="m-btn ghost" data-hi="${i}">Restaurar</button>
        </li>`).join("") || "<li>Sin historial todavía.</li>"}
      </ul>
      <button class="m-btn ghost" id="close">Cerrar</button>
    </div>`;
    document.body.appendChild(wrap);
    wrap.querySelector("#close").onclick = () => wrap.remove();
    wrap.querySelectorAll("[data-hi]").forEach((b) => {
      b.onclick = () => {
        const item = state.history[Number(b.dataset.hi)];
        if (!item) return;
        state.undo.push(pack());
        state.redo = [];
        applyPack(item.data);
        state.last = pack();
        state.dirty = true;
        state.save = "Sin guardar";
        wrap.remove();
        paintChrome();
        clearTimeout(state.timer);
        state.timer = setTimeout(save, 400);
        toast("Estado restaurado");
      };
    });
  }

  async function save() {
    state.save = "Guardando…";
    paint();
    try {
      if (state.region === "footer") state.footer = await api.put("/footer", state.footer);
      else state.header = await api.put("/header", state.header);
      state.save = "Guardado";
      state.dirty = false;
      state.last = pack();
      pushHistory("Guardado");
      reload();
    } catch (e) {
      state.save = "Error al guardar";
      toast(e.message);
    }
    paint();
  }

  function paint() {
    const s = root.querySelector(".b-status");
    if (s) s.textContent = state.save;
  }

  function reload() {
    const iframe = root.querySelector("iframe");
    const base = cfg.preview || cfg.home;
    if (iframe) iframe.src = base + (String(base).includes("?") ? "&" : "?") + "t=" + Date.now();
  }

  function field(label, inner) {
    return `<label>${esc(label)} ${inner}</label>`;
  }

  function inspector() {
    return state.region === "footer" ? footerFields() : headerFields();
  }

  function headerFields() {
    const h = state.header || {};
    return `
      <div class="acc"><h5>Header</h5>
        <p class="m-muted">Click en la cabecera del canvas. Guardar escribe en el sitio público.</p>
      </div>
      <div class="acc"><h5>Contenido</h5>
        ${field("Texto CTA", `<input data-h="ctaText" value="${esc(h.ctaText || "")}">`)}
        ${field("URL CTA", `<input data-h="ctaUrl" value="${esc(h.ctaUrl || "")}">`)}
        ${field("Menú", `<select data-h="menuSlug">${(state.menus || []).map((m) => `<option value="${esc(m.slug)}" ${h.menuSlug === m.slug ? "selected" : ""}>${esc(m.name || m.slug)}</option>`).join("")}</select>`)}
        ${field("Logo (ID)", `<input data-h-num="logoId" value="${h.logoId || 0}"><button type="button" class="m-btn ghost" data-media="logoId">Biblioteca</button>`)}
        ${field("Logo mobile (ID)", `<input data-h-num="logoMobile" value="${h.logoMobile || 0}"><button type="button" class="m-btn ghost" data-media="logoMobile">Biblioteca</button>`)}
      </div>
      <div class="acc"><h5>Diseño</h5>
        ${window.KrgUi.colorField("Fondo", h.background || "", 'data-h="background"')}
        ${window.KrgUi.colorField("Color texto", h.color || "", 'data-h="color"')}
        ${field("Alineación", `<select data-h="align"><option value="left" ${h.align !== "center" ? "selected" : ""}>Izquierda</option><option value="center" ${h.align === "center" ? "selected" : ""}>Centro</option></select>`)}
        ${field("Alto (px)", `<input type="number" data-h-num="height" value="${h.height || 72}">`)}
        ${field("Padding Y", `<input type="number" data-h-num="paddingY" value="${h.paddingY || 12}">`)}
        ${field("Ancho logo", `<input type="number" data-h-num="logoWidth" value="${h.logoWidth || 140}">`)}
        <label>Sticky <input type="checkbox" data-h-bool="sticky" ${h.sticky ? "checked" : ""}></label>
        <label>Transparente <input type="checkbox" data-h-bool="transparent" ${h.transparent ? "checked" : ""}></label>
      </div>`;
  }

  function footerFields() {
    const f = state.footer || {};
    const social = (f.social || []).map((s) => `${s.label || ""}|${s.url || ""}`).join("\n");
    return `
      <div class="acc"><h5>Footer</h5>
        <p class="m-muted">Click en el pie del canvas.</p>
      </div>
      <div class="acc"><h5>Contenido</h5>
        ${field("Texto", `<textarea data-f="text">${esc(f.text || "")}</textarea>`)}
        ${field("Copyright", `<input data-f="copyright" value="${esc(f.copyright || "")}">`)}
        ${field("Columna extra (título)", `<input data-f="extraTitle" value="${esc(f.extraTitle || "")}">`)}
        ${field("Columna extra (texto)", `<textarea data-f="extraText">${esc(f.extraText || "")}</textarea>`)}
        ${field("Redes (Nombre|URL)", `<textarea data-f="social">${esc(social)}</textarea>`)}
        ${field("Menú", `<select data-f="menuSlug">${(state.menus || []).map((m) => `<option value="${esc(m.slug)}" ${f.menuSlug === m.slug ? "selected" : ""}>${esc(m.name || m.slug)}</option>`).join("")}</select>`)}
        ${field("Logo (ID)", `<input data-f-num="logoId" value="${f.logoId || 0}"><button type="button" class="m-btn ghost" data-fmedia="logoId">Biblioteca</button>`)}
        <label>Mostrar buscador <input type="checkbox" data-f-bool="showSearch" ${f.showSearch ? "checked" : ""}></label>
      </div>
      <div class="acc"><h5>Diseño</h5>
        ${window.KrgUi.colorField("Fondo", f.background || "", 'data-f="background"')}
        ${window.KrgUi.colorField("Color", f.color || "", 'data-f="color"')}
        ${field("Columnas", `<input type="number" min="1" max="4" data-f-num="columns" value="${f.columns || 3}">`)}
        ${field("Padding Y", `<input type="number" data-f-num="paddingY" value="${f.paddingY || 64}">`)}
      </div>`;
  }

  function bindInspector() {
    const box = root.querySelector(".b-insp");
    if (!box) return;
    const bind = (sel, fn) => box.querySelectorAll(sel).forEach(fn);
    bind("[data-h]", (inp) => {
      const go = () => { state.header[inp.dataset.h] = inp.value; markDirty(); };
      inp.addEventListener("input", go);
      inp.addEventListener("change", go);
    });
    bind("[data-h-num]", (inp) => inp.addEventListener("input", () => { state.header[inp.dataset.hNum] = Number(inp.value); markDirty(); }));
    bind("[data-h-bool]", (inp) => inp.addEventListener("change", () => { state.header[inp.dataset.hBool] = inp.checked; markDirty(); }));
    bind("[data-f]", (inp) => {
      const go = () => { state.footer[inp.dataset.f] = inp.value; markDirty(); };
      inp.addEventListener("input", go);
      inp.addEventListener("change", go);
    });
    bind("[data-f-num]", (inp) => inp.addEventListener("input", () => { state.footer[inp.dataset.fNum] = Number(inp.value); markDirty(); }));
    bind("[data-f-bool]", (inp) => inp.addEventListener("change", () => { state.footer[inp.dataset.fBool] = inp.checked; markDirty(); }));
    bind("[data-media]", (b) => {
      b.onclick = () => media("header", b.dataset.media);
    });
    bind("[data-fmedia]", (b) => {
      b.onclick = () => media("footer", b.dataset.fmedia);
    });
    window.KrgUi?.wire(box);
  }

  function media(which, key) {
    if (!window.wp?.media) return;
    const frame = wp.media({ title: "Imagen", multiple: false });
    frame.on("select", () => {
      const id = frame.state().get("selection").first().toJSON().id;
      if (which === "header") state.header[key] = id;
      else state.footer[key] = id;
      markDirty();
      paintInspector();
    });
    frame.open();
  }

  function paintInspector() {
    const box = root.querySelector(".b-insp");
    if (!box) return;
    box.innerHTML = inspector();
    bindInspector();
  }

  function ensureShell() {
    if (state.shell) return;
    root.innerHTML = `
      <div class="b-root">
        <div class="b-top">
          <a href="${cfg.wpAdmin || "/wp-admin/"}" title="Volver a WordPress">←</a>
          <a href="${cfg.admin}?page=krg-nav">Navegación</a>
          <strong>Chrome del sitio</strong>
          <div class="b-bp" id="regions">
            <button data-region="header">Header</button>
            <button data-region="footer">Footer</button>
          </div>
          <div class="b-bp" id="bps">
            <button data-bp="desktop">Desktop</button>
            <button data-bp="tablet">Tablet</button>
            <button data-bp="mobile">Mobile</button>
          </div>
          <span class="grow"></span>
          <button class="m-btn ghost" id="undo" title="Ctrl+Z">Deshacer</button>
          <button class="m-btn ghost" id="redo" title="Ctrl+Y">Rehacer</button>
          <button class="m-btn ghost" id="history">Historial</button>
          <span class="b-status">Guardado</span>
          <button class="m-btn" id="save">Guardar</button>
        </div>
        <div class="b-layout">
          <aside class="b-left">
            <div class="b-sec"><h4>Región</h4>
              <div class="b-palette">
                <button data-region="header">Header</button>
                <button data-region="footer">Footer</button>
              </div>
              <p class="b-empty">El canvas es la home real. Click en cabecera o pie para inspeccionar. Los campos se guardan solos.</p>
            </div>
          </aside>
          <div class="b-canvas">
            <div class="b-frame-wrap">
              <iframe src="${esc(cfg.preview || cfg.home)}"></iframe>
            </div>
          </div>
          <aside class="b-right b-insp"></aside>
        </div>
      </div>`;
    state.shell = true;
    root.querySelectorAll("[data-region]").forEach((b) => {
      b.onclick = () => { state.region = b.dataset.region; paintChrome(); ping(); };
    });
    root.querySelectorAll("[data-bp]").forEach((b) => {
      b.onclick = () => { state.bp = b.dataset.bp; paintChrome(); };
    });
    root.querySelector("#save").onclick = save;
    root.querySelector("#undo").onclick = undo;
    root.querySelector("#redo").onclick = redo;
    root.querySelector("#history").onclick = openHistory;
  }

  function paintChrome() {
    root.querySelectorAll("[data-region]").forEach((b) => b.classList.toggle("is-on", b.dataset.region === state.region));
    root.querySelectorAll("[data-bp]").forEach((b) => b.classList.toggle("is-on", b.dataset.bp === state.bp));
    const wrap = root.querySelector(".b-frame-wrap");
    if (wrap) wrap.style.width = state.widths[state.bp];
    paintInspector();
    paint();
  }

  function ping() {
    root.querySelector("iframe")?.contentWindow?.postMessage({ source: "krg-parent", type: "chrome", region: state.region }, "*");
  }

  window.addEventListener("message", (e) => {
    const d = e.data;
    if (!d || d.source !== "krg") return;
    if (d.type === "chrome" && d.region && d.region !== state.region) {
      state.region = d.region;
      paintChrome();
    }
  });
  window.addEventListener("keydown", (e) => {
    const meta = e.ctrlKey || e.metaKey;
    if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (meta && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
      e.preventDefault();
      redo();
    } else if (meta && e.key.toLowerCase() === "s") {
      e.preventDefault();
      save();
    }
  });
  window.addEventListener("beforeunload", (e) => {
    if (state.dirty) { e.preventDefault(); e.returnValue = ""; }
  });

  Promise.all([api.get("/header"), api.get("/footer"), api.get("/menus"), api.get("/tokens").catch(() => ({}))])
    .then(([header, footer, menus, tokens]) => {
      state.header = header;
      state.footer = footer;
      state.menus = menus;
      window.KrgUi?.setTokens(tokens);
      state.last = pack();
      pushHistory("Cargado");
      ensureShell();
      paintChrome();
    })
    .catch((e) => { root.innerHTML = `<p style="padding:24px">${esc(e.message)}</p>`; });
})();
