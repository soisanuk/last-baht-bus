// Terminal renderer: scrollback, prompt echo, command history, verb chips,
// autocomplete. All DOM work lives here; the engine only knows the print
// callback, and completion candidates come from engineComplete (engine.js) —
// the terminal renders them but never decides them.

const _term = (() => {
  let _out, _input, _suggest;
  const _history = [];
  let _histIdx = -1;
  let _tabBase = null, _tabIdx = -1; // Tab-cycling state; any real keystroke resets

  // ── Actionable-word decoration ─────────────────────────────────────────
  // The engine prints plain prose (frontend-agnostic, per CLAUDE.md); making
  // actionable words obvious is presentation, so it lives here. Wrapped in
  // <b class="kw">: character names (TALK/ASK), enterable bar names, items
  // in the room or your pocket (TAKE/READ/EXAMINE), the exits line, and
  // ALL-CAPS command hints inside parentheses. These spans are the future
  // tap targets for the flyout wheel.
  function _escapeHtml(s) {
    return s.replace(/[&<>"]/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function _kwNames() {
    const names = [];
    try {
      for (const n of Object.values(NPCS)) names.push(n.name);
      if (typeof PATRONS !== "undefined") {
        for (const p of Object.values(PATRONS)) names.push(p.name);
      }
      for (const r of Object.values(ROOMS)) if (r.bar) names.push(r.bar);
      if (typeof G !== "undefined" && G && G.itemLoc) {
        for (const id of Object.keys(G.itemLoc)) {
          const loc = G.itemLoc[id];
          if (loc === "inventory" || loc === G.room) names.push(ITEMS[id].name);
        }
      }
    } catch (e) { /* pre-boot print: decorate nothing */ }
    return names;
  }

  function decorate(text) {
    let html = _escapeHtml(text);
    // exits line: every token is a direction you can type
    if (/^Exits: /.test(text)) {
      return "Exits: " + html.slice(7).replace(/([a-z]+)/g, '<b class="kw">$1</b>');
    }
    const names = _kwNames();
    if (names.length) {
      names.sort((a, b) => b.length - a.length); // "Candy Bar 2" before "Candy"
      const pat = new RegExp("\\b(" +
        names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") +
        ")\\b", "g");
      html = html.replace(pat, '<b class="kw">$1</b>');
    }
    // ALL-CAPS command hints inside parentheses: (WATCH POLICE · or NO)
    html = html.replace(/\(([^()]*)\)/g, (m, inner) =>
      "(" + inner.replace(/([A-Z]{2,}(?:[ -][A-Z0-9]{2,})*(?: &lt;[a-z… ]+&gt;)?)/g,
        '<b class="kw">$1</b>') + ")");
    return html;
  }

  function print(text, cls) {
    if (!_out) return;
    const div = document.createElement("div");
    div.className = "t-line" + (cls ? " t-" + cls : "");
    div.innerHTML = decorate(text);
    _out.appendChild(div);
    _out.scrollTop = _out.scrollHeight;
  }

  function echo(cmd) {
    const div = document.createElement("div");
    div.className = "t-line t-echo";
    div.textContent = "❯ " + cmd;
    _out.appendChild(div);
  }

  function _candidates(base) {
    return typeof engineComplete === "function" ? engineComplete(base) : [];
  }

  function _applyCandidate(c) {
    const m = _input.value.match(/^(.*?)(\S*)$/s);
    _input.value = m[1] + c + " ";
    _tabBase = null;
    _tabIdx = -1;
    _input.focus();
    _refreshSuggest();
  }

  function _refreshSuggest() {
    if (!_suggest) return;
    const cands = _input.value.trim() ? _candidates(_input.value) : [];
    _suggest.innerHTML = "";
    for (const c of cands.slice(0, 6)) {
      const s = document.createElement("span");
      s.textContent = c;
      s.addEventListener("click", () => _applyCandidate(c));
      _suggest.appendChild(s);
    }
    _suggest.style.display = cands.length ? "flex" : "none";
  }

  function submit(onCommand) {
    const cmd = _input.value.trim();
    if (!cmd) return;
    echo(cmd);
    _history.push(cmd);
    _histIdx = _history.length;
    _input.value = "";
    _tabBase = null;
    _tabIdx = -1;
    _refreshSuggest();
    onCommand(cmd);
    _out.scrollTop = _out.scrollHeight;
  }

  function init(onCommand) {
    _out = document.getElementById("term-out");
    _input = document.getElementById("term-in");
    _suggest = document.getElementById("term-suggest");

    _input.addEventListener("keydown", e => {
      if (e.key === "Enter") { submit(onCommand); }
      else if (e.key === "Tab") {
        e.preventDefault();
        if (_tabBase === null) { _tabBase = _input.value; _tabIdx = -1; }
        const cands = _candidates(_tabBase);
        if (!cands.length) return;
        _tabIdx = (_tabIdx + 1) % cands.length;
        const m = _tabBase.match(/^(.*?)(\S*)$/s);
        _input.value = m[1] + cands[_tabIdx] + " ";
        _refreshSuggest();
      } else if (e.key === "ArrowUp") {
        if (_histIdx > 0) { _histIdx--; _input.value = _history[_histIdx]; }
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        if (_histIdx < _history.length - 1) { _histIdx++; _input.value = _history[_histIdx]; }
        else { _histIdx = _history.length; _input.value = ""; }
        e.preventDefault();
      }
    });

    // real typing (not programmatic Tab fills) resets the cycle and re-suggests
    _input.addEventListener("input", () => {
      _tabBase = null;
      _tabIdx = -1;
      _refreshSuggest();
    });

    // tap anywhere in the output refocuses the input (but let text selection be)
    _out.addEventListener("click", () => {
      if (!window.getSelection().toString()) _input.focus();
    });

    // verb chips: insert text; chips ending in a space wait for an object,
    // bare chips submit immediately
    document.querySelectorAll(".chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const t = chip.dataset.cmd;
        if (t.endsWith(" ")) {
          _input.value = t;
          _input.focus();
          _refreshSuggest();
        } else {
          _input.value = t;
          submit(onCommand);
        }
      });
    });

    _input.focus();
  }

  return { init, print, decorate };
})();
