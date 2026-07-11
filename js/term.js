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

  function _kwIndex() {
    const kind = new Map(); // display name → npc | patron | bar | item
    try {
      for (const n of Object.values(NPCS)) {
        // Anonymous staff (lowercase names, e.g. "security") only glow where
        // they actually stand — prose mentions elsewhere would tap into a
        // dead-end "ask … about security". Named characters decorate
        // everywhere: gossip about the absent is the whole economy.
        if (/^[a-z]/.test(n.name) && (!G || n.room !== G.room)) continue;
        kind.set(n.name, "npc");
      }
      if (typeof PATRONS !== "undefined") {
        for (const p of Object.values(PATRONS)) kind.set(p.name, "patron");
      }
      for (const r of Object.values(ROOMS)) if (r.bar) kind.set(r.bar, "bar");
      if (typeof G !== "undefined" && G && G.itemLoc) {
        for (const id of Object.keys(G.itemLoc)) {
          const loc = G.itemLoc[id];
          if (loc === "inventory" || loc === G.room) kind.set(ITEMS[id].name, "item");
        }
      }
    } catch (e) { /* pre-boot print: decorate nothing */ }
    return kind;
  }

  function _wrap(k, v) {
    return `<b class="kw" data-k="${k}" data-v="${v}">${v}</b>`;
  }

  function decorate(text) {
    let html = _escapeHtml(text);
    // exits line: every token is a direction you can walk
    if (/^Exits: /.test(text)) {
      return "Exits: " + html.slice(7).replace(/([a-z]+)/g, _wrap("exit", "$1"));
    }
    const kind = _kwIndex();
    if (kind.size) {
      const names = [...kind.keys()].sort((a, b) => b.length - a.length);
      const pat = new RegExp("\\b(" +
        names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") +
        ")\\b", "g");
      html = html.replace(pat, m => _wrap(kind.get(m), m));
    }
    // ALL-CAPS command hints inside parentheses: (WATCH POLICE · or NO)
    html = html.replace(/\(([^()]*)\)/g, (m, inner) =>
      "(" + inner.replace(/([A-Z]{2,}(?:[ -][A-Z0-9]{2,})*(?: &lt;[a-z… ]+&gt;)?)/g,
        c => _wrap("cmd", c)) + ")");
    // Thai runs: tokenise against the vendored vocab (plus NPC Thai names,
    // so แคนดี้ stays whole instead of shredding into vocab fragments).
    // Known words tap open the word-card modal; unknown runs of 2+ chars
    // still offer the decomposition-only card.
    html = html.replace(/[\u0E00-\u0E7F]{2,}/g, run => {
      if (/^[๐-๙]+$/.test(run)) return run; // Thai numerals are the puzzle, not vocab
      const toks = _thaiTokens(run);
      if (!toks) return run;
      return toks.map(t =>
        (t.word || t.text.length >= 2) && !/^[๐-๙]+$/.test(t.text)
          ? _wrap("thai", t.text) : t.text).join("");
    });
    return html;
  }

  // Lazy tokenizer over the vendored WORDS plus the world's Thai names.
  let _thTok = null;
  function _thaiTokens(run) {
    try {
      if (!_thTok) {
        const m = {};
        for (const w of WORDS) m[w[0]] = w;
        for (const n of Object.values(NPCS)) if (n.th) m[n.th] = ["ent"];
        _thTok = makeTokeniser(m);
      }
      return _thTok(run);
    } catch (e) { return null; } // vendored stack absent: leave Thai plain
  }

  // ── Portraits ──────────────────────────────────────────────────────────
  // Pixel-art busts in web/portraits/<id>.png (regenerate with
  // scripts/gen-portraits.py). Purely presentational: a missing file just
  // removes the <img>, so the game never depends on a portrait existing.
  let _portIdx = null;
  function _portraitId(k, v) {
    try {
      if (!_portIdx) {
        _portIdx = new Map();
        for (const [id, n] of Object.entries(NPCS)) _portIdx.set("npc:" + n.name, id);
        if (typeof PATRONS !== "undefined") {
          for (const [id, p] of Object.entries(PATRONS)) _portIdx.set("patron:" + p.name, id);
        }
      }
      return _portIdx.get(k + ":" + v) || null;
    } catch (e) { return null; }
  }

  function _avatar(id, cls) {
    const img = document.createElement("img");
    img.className = cls;
    img.src = "portraits/" + id + ".png";
    img.alt = "";
    img.addEventListener("error", () => img.remove());
    return img;
  }

  // On the presence lines the engine's emoji becomes a portrait: the emoji
  // is the last token of the text node before each name, so strip it there
  // and drop the avatar in at the front of the name span.
  function _addAvatars(div, text) {
    if (!/^(Here: |At the rail: )/.test(text)) return;
    for (const kw of div.querySelectorAll('.kw[data-k="npc"], .kw[data-k="patron"]')) {
      const id = _portraitId(kw.dataset.k, kw.dataset.v);
      if (!id) continue;
      const prev = kw.previousSibling;
      if (prev && prev.nodeType === 3) {
        prev.nodeValue = prev.nodeValue.replace(/[^\s,]+\s*$/, "");
      }
      kw.insertBefore(_avatar(id, "kw-av"), kw.firstChild);
    }
  }

  // ── The flyout wheel ──────────────────────────────────────────────────
  // Tap a kw → the quick, contextually-right actions (or straight execution
  // when there's exactly one, e.g. exits). Long-press / right-click → the
  // comprehensive list, including an NPC's live ask-topics. Every action
  // goes through the normal submit path, so taps echo as typed commands
  // and the engine never knows a wheel exists.

  // Ask-topics that are somebody's name stay hidden until that name has
  // printed in the transcript — the engine's _topicKnown gates both this
  // wheel and the input autocomplete. Typed ASK is not gated.
  function _kwActions(k, v, full) {
    const a = [];
    const lo = v.toLowerCase();
    try {
      if (k === "thai") {
        // the dictionary is one tap away — unless the word is alive in the
        // world, in which case the world gets first claim and translate
        // rides along on the wheel
        const translate = { t: "🔍 translate " + v, fn: () => {
          const w = (typeof _wcMap === "function" && _wcMap()[v]) || [v, "", ""];
          openWordModal(w);
        } };
        let ent = null;
        for (const [id, n] of Object.entries(NPCS)) if (n.th === v) ent = id;
        if (ent) return [..._kwActions("npc", NPCS[ent].name, full), translate];
        return [translate];
      }
      if (k === "exit") return [{ t: "go " + v, c: "go " + v, go: true }];
      if (k === "cmd") {
        const open = /<|…|\[/.test(v);
        return [{ t: lo, c: lo.replace(/\s*[<…[].*$/, "") + (open ? " " : ""), go: !open }];
      }
      if (k === "bar") return [{ t: "enter " + v, c: "enter " + lo, go: true }];
      if (k === "item") {
        let id = null;
        for (const [iid, it] of Object.entries(ITEMS)) if (it.name === v) id = iid;
        const loc = id ? G.itemLoc[id] : null;
        if (loc === G.room) a.push({ t: "take", c: "take " + lo, go: true });
        a.push({ t: "examine", c: "x " + lo, go: true });
        if (loc === "inventory") {
          a.push({ t: "read", c: "read " + lo, go: true });
          if (full) {
            a.push({ t: "drop", c: "drop " + lo, go: true });
            a.push({ t: "give to …", c: `give ${lo} to `, go: false });
          }
        }
        return a;
      }
      // npc | patron
      const npc = typeof _findNpc === "function" ? _findNpc(lo) : null;
      const pat = !npc && typeof _findPatron === "function" ? _findPatron(lo) : null;
      if (!npc && !pat) {
        // not here: ask whoever is
        const here = _npcsHere();
        if (here.length) {
          a.push({ t: `ask ${NPCS[here[0]].name} about ${lo}`,
            c: `ask ${NPCS[here[0]].name.toLowerCase()} about ${lo}`, go: true });
        }
        a.push({ t: "ask … about " + lo, c: "ask ", go: false });
        return a;
      }
      a.push({ t: "talk", c: "talk to " + lo, go: true });
      const topics = (npc
        ? NPCS[npc].dialogue.filter(d => d.topic &&
            (!d.req || d.req.every(f => G.flags[f])) &&
            (!d.notFlags || d.notFlags.every(f => !G.flags[f]))).map(d => d.topic)
        : PATRONS[pat].dialogue.filter(d => d.topic).map(d => d.topic)
      ).filter(_topicKnown);
      if (full) {
        for (const t of topics.slice(0, 6)) {
          a.push({ t: "ask about " + t, c: `ask ${lo} about ${t}`, go: true });
        }
      } else if (topics.length) {
        a.push({ t: "ask about …", c: `ask ${lo} about `, go: false });
      }
      a.push({ t: "examine", c: "x " + lo, go: true });
      const role = npc && typeof NPC_ROLES !== "undefined" ? NPC_ROLES[npc] : null;
      if (role) a.push({ t: "buy her a drink", c: "buy drink for " + lo, go: true });
      if (full && role === "hostess") {
        a.push({ t: "flirt", c: "flirt " + lo, go: true });
        a.push({ t: "tip …", c: `tip ${lo} `, go: false });
        a.push({ t: "contact", c: "contact " + lo, go: true });
        a.push({ t: "barfine", c: "barfine " + lo, go: true });
      }
      if (full && !role && npc) a.push({ t: "wai", c: "wai " + lo, go: true });
    } catch (e) { /* engine not booted: no actions */ }
    return a;
  }

  let _fly = null, _onCmd = null, _pressTimer = null, _longFired = false;

  function _closeFly() {
    if (_fly) { _fly.remove(); _fly = null; }
  }

  function _runAct(act) {
    _closeFly();
    if (act.fn) { act.fn(); return; }
    _input.value = act.c;
    if (act.go) { submit(_onCmd); }
    else { _input.focus(); _refreshSuggest(); }
  }

  function _openFly(kwEl, full) {
    _closeFly();
    const acts = _kwActions(kwEl.dataset.k, kwEl.dataset.v, full);
    if (!acts.length) return;
    if (acts.length === 1 && (acts[0].go || acts[0].fn) && !full) { _runAct(acts[0]); return; }
    _fly = document.createElement("div");
    _fly.id = "flyout";
    // a character wheel gets a portrait header (Thai-name taps included)
    let pid = null;
    if (kwEl.dataset.k === "npc" || kwEl.dataset.k === "patron") {
      pid = _portraitId(kwEl.dataset.k, kwEl.dataset.v);
    } else if (kwEl.dataset.k === "thai") {
      try {
        for (const [id, n] of Object.entries(NPCS)) if (n.th === kwEl.dataset.v) pid = id;
      } catch (e) { /* world not loaded */ }
    }
    if (pid) {
      const head = document.createElement("div");
      head.className = "fly-head";
      head.appendChild(_avatar(pid, "fly-av"));
      const nm = document.createElement("span");
      nm.textContent = kwEl.dataset.k === "thai" ? NPCS[pid].name : kwEl.dataset.v;
      head.appendChild(nm);
      _fly.appendChild(head);
    }
    for (const act of acts) {
      const b = document.createElement("button");
      b.textContent = act.t + (act.go ? "" : " …");
      b.addEventListener("click", e => { e.stopPropagation(); _runAct(act); });
      _fly.appendChild(b);
    }
    document.body.appendChild(_fly);
    const r = kwEl.getBoundingClientRect();
    const fw = _fly.offsetWidth, fh = _fly.offsetHeight;
    let x = Math.min(r.left, window.innerWidth - fw - 8);
    let y = r.bottom + 6;
    if (y + fh > window.innerHeight - 8) y = Math.max(8, r.top - fh - 6);
    _fly.style.left = Math.max(8, x) + "px";
    _fly.style.top = y + "px";
  }

  function print(text, cls) {
    if (!_out) return;
    const div = document.createElement("div");
    div.className = "t-line" + (cls ? " t-" + cls : "");
    div.innerHTML = decorate(text);
    _addAvatars(div, text);
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

    // the send button: complete a wheel-prefilled command without the keyboard
    const sendBtn = document.getElementById("term-send");
    if (sendBtn) sendBtn.addEventListener("click", () => submit(onCommand));

    // real typing (not programmatic Tab fills) resets the cycle and re-suggests
    _input.addEventListener("input", () => {
      _tabBase = null;
      _tabIdx = -1;
      _refreshSuggest();
    });

    // the flyout wheel: tap a kw = quick actions; long-press / right-click =
    // the comprehensive list. Pointer timers, not click, decide which.
    _onCmd = onCommand;
    let _pressX = 0, _pressY = 0;
    _out.addEventListener("pointerdown", e => {
      const kw = e.target.closest(".kw");
      if (!kw) return;
      _longFired = false;
      _pressX = e.clientX; _pressY = e.clientY;
      clearTimeout(_pressTimer);
      _pressTimer = setTimeout(() => { _longFired = true; _openFly(kw, true); }, 500);
    });
    _out.addEventListener("pointermove", e => {
      // a drag is a scroll, not a hold
      if (Math.abs(e.clientX - _pressX) + Math.abs(e.clientY - _pressY) > 12) {
        clearTimeout(_pressTimer);
      }
    });
    _out.addEventListener("pointerup", () => clearTimeout(_pressTimer));
    _out.addEventListener("pointercancel", () => clearTimeout(_pressTimer));
    _out.addEventListener("contextmenu", e => {
      const kw = e.target.closest(".kw");
      if (kw) { e.preventDefault(); _openFly(kw, true); }
    });

    // tap: quick wheel on a kw; otherwise close any flyout and refocus input
    _out.addEventListener("click", e => {
      const kw = e.target.closest(".kw");
      if (kw) {
        if (_longFired) { _longFired = false; return; } // the long-press already opened
        _openFly(kw, false);
        return;
      }
      _closeFly();
      if (!window.getSelection().toString()) _input.focus();
    });
    // tapping anywhere else dismisses the wheel
    document.addEventListener("click", e => {
      if (_fly && !_fly.contains(e.target) && !e.target.closest(".kw")) _closeFly();
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

  return { init, print, decorate, kwActions: _kwActions };
})();
