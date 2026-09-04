// Terminal renderer: scrollback, prompt echo, command history, verb chips,
// autocomplete. All DOM work lives here; the engine only knows the print
// callback, and completion candidates come from engineComplete (engine-parser.js) —
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

  // Filler-girl names that are also everyday words — decorate only where she
  // stands, never in prose that merely uses the word ("Best seat", "Sang Som",
  // "Near the end"). Same treatment as the lowercase anonymous staff below.
  // "Pinky" is a word inside the bar name "Stinky Pinky" — the filler hostess of
  // that name was shedding a tap from every "Stinky Pinky" in prose (skimmer
  // playtest, 2026-08-17). Like the others here, she now decorates only where
  // she stands (Cheeky Monkey), never in the venue name.
  const _WORD_NAME_NPCS = new Set(["Best", "Proud", "Near", "Nice", "Hong", "Som", "Pinky"]);
  function _kwIndex() {
    const kind = new Map(); // display name → npc | patron | bar | item
    try {
      for (const [nid, n] of Object.entries(NPCS)) {
        // Anonymous staff (lowercase names, e.g. "security") only glow where
        // they actually stand — prose mentions elsewhere would tap into a
        // dead-end "ask … about security". Named characters decorate
        // everywhere: gossip about the absent is the whole economy.
        // (_npcRoom, not n.room, so a multi-bar schedule can't strand the gate.)
        if ((/^[a-z]/.test(n.name) || _WORD_NAME_NPCS.has(n.name)) &&
            (!G || _npcRoom(nid) !== G.room)) continue;
        // The rail regulars decorate everywhere and keep the "patron" kind —
        // one cast in the engine since the fold, but data-k is a published DOM
        // contract (docs/2d-roadmap.md) and the wheel routes on it.
        kind.set(n.name, n.patron ? "patron" : "npc");
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
    // The taxi-ride intro is a pure numbered-choice modal — its answers come from
    // the chip bar, and its prose names entities (Tan the driver, "Golf" the origin
    // colliding with Golf the hostess) that must NOT become taps: tapping submits
    // "talk to tan" / "talk to golf", which the modal rejects. Render it plain.
    if (typeof G !== "undefined" && G && G.pendingChoice === "intro")
      return _escapeHtml(text).replace(/\{\{([\s\S]*?)\}\}/g, "$1");
    // SECURITY INVARIANT: escape the WHOLE string first, wrap known tokens
    // after. Everything below operates on already-escaped text, which is why
    // player input (dog names, answers) and the authored {{…}} hatch can never
    // inject markup. Do not add a "trusted HTML" path here — audited 2026-08-17,
    // docs/ctf.md "Input safety".
    let html = _escapeHtml(text);
    // exits line: every token is a direction you can walk
    if (/^Exits: /.test(text)) {
      return "Exits: " + html.slice(7).replace(/([a-z]+)/g, _wrap("exit", "$1"));
    }
    // Plain spans: authored {{…}} suppresses ALL tap-decoration inside — the
    // content writer's escape hatch for a word that would wrongly tap (an item
    // someone else owns, a proper noun that isn't gossipable). Swap each to an
    // inert null-delimited placeholder now — nothing below matches it — and
    // restore the inner (already HTML-escaped, undecorated) at the very end.
    const _plain = [];
    html = html.replace(/\{\{([\s\S]*?)\}\}/g, (_m, inner) =>
      `\u0000${_plain.push(inner) - 1}\u0000`);
    const kind = _kwIndex();
    if (kind.size) {
      const names = [...kind.keys()].sort((a, b) => b.length - a.length);
      const pat = new RegExp("\\b(" +
        names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") +
        ")\\b", "g");
      html = html.replace(pat, (m, _g, offset, str) => {
        const k = kind.get(m);
        // An item name after a third-person possessive is somebody else's — "her
        // phone", "his wallet", "Candy's phone" — not your tappable inventory item,
        // so leave it plain. "your phone" / "the phone" still tap through to it.
        if (k === "item" &&
            /(?:\b(?:her|his|their|its)|['’]s)\s+$/i.test(str.slice(0, offset))) {
          return m;
        }
        return _wrap(k, m);
      });
    }
    // ALL-CAPS command hints inside parentheses: (WATCH POLICE · or NO)
    // <placeholders> may sit mid-pattern (SEND <amount> TO <name>) — the whole
    // phrase is one open kw, never orphan TO/FOR fragments.
    // FIRST shield already-emitted <b class="kw"> tags: an NPC like "DJ Beer"
    // wrapped in the entity pass put "DJ" inside a data-v="…" attribute, and this
    // pass's [A-Z]{2,} matched it and split the tag, leaking `">` as visible text
    // (Alan playtest, 2026-08-17). Any 2+-cap name in parenthesized prose hit it.
    const _tags = [];
    html = html.replace(/<b class="kw"[^>]*>[\s\S]*?<\/b>/g, t =>
      `\u0001${_tags.push(t) - 1}\u0001`);
    html = html.replace(/\(([^()]*)\)/g, (m, inner) =>
      "(" + inner.replace(/([A-Z]{2,}(?:[ -][A-Z0-9]{2,}|\s&lt;[a-z…0-9 |]+&gt;)*)/g,
        c => _wrap("cmd", c)) + ")");
    if (_tags.length) html = html.replace(/\u0001(\d+)\u0001/g, (_m, i) => _tags[+i]);
    // Quiz answer lines: while a quiz is live, the leading "1./2./3." is a
    // tappable pick. A bare digit is never a cmd hint anywhere else, so gate
    // on G.game — otherwise numbered prose would sprout dead taps.
    try {
      if (G && G.game && G.game.type === "quiz") {
        html = html.replace(/^(\s*)([1-3])(\.\s)/, (m, sp, d, rest) =>
          sp + _wrap("cmd", d) + rest);
      }
      // Connect 4: while a c4 game is live, the board's column-number row taps
      // to drop, and a standalone Q taps to quit — so mobile plays with no
      // keyboard. The number row is the only all-digits line c4 prints; the
      // full-row anchor keeps prose numbers (฿20, "1-7") from sprouting taps.
      if (G && G.game && G.game.type === "c4") {
        html = html.replace(/^[1-7](?: +[1-7]){6}$/m, row =>
          row.replace(/[1-7]/g, d => _wrap("cmd", d)));
        html = html.replace(/\bQ\b/g, _wrap("cmd", "Q"));
      }
    } catch (e) { /* pre-boot: no game, nothing to decorate */ }
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
    // restore the plain spans: their inner text prints exactly, decorated by nothing
    if (_plain.length) html = html.replace(/\u0000(\d+)\u0000/g, (_m, i) => _plain[+i]);
    return html;
  }

  // Lazy tokenizer over the vendored WORDS plus the world's Thai names.
  // THE STRANDED LETTER. Greedy longest-match takes a shorter word that is a
  // prefix of the real one and leaves the remainder as a lone letter: ซอยบัวขาว
  // came out ซอย|บัว|ขา|ว ("soi, lotus, leg" and a loose ว), because the
  // curriculum has ขา "leg" and no bare ขาว. The vendored tokeniser can rejoin a
  // stray letter, but only if it can ASK whether the result is a word — joining
  // blind is wrong about one time in fifty-five (the trainer measured it on its
  // own examples: ไปอ|ย่าง, ให้พ|นัก|งาน). So we hand it the words the game
  // itself uses that the course does not teach. Every one of these was found by
  // the harvest in term.test.js, which fails if the game ever prints another.
  // The heal only reaches a letter with an UNMATCHED neighbour, which is the
  // prefix case (ขาว) and no more: five of the six strandings in this game have
  // a real word on both sides — จริง|ห|รอ, |ห|วัด, |อ|ย่า, มา|ร|ยา|ท|ดี — where
  // no merge is legal and the only fix is the whole word being in the map, so
  // longest-match takes it first. Both are wired: these rows go INTO the map,
  // and the predicate below still saves any future place name of the ขาว shape.
  // Romanisation follows the trainer's scheme (RTGS consonants, Paiboon tone
  // marks, long vowels doubled); where it isn't certain it is left EMPTY on
  // purpose — the card still shows the letters and the tone rule, and a wrong
  // mark teaches a wrong tone.
  // EMPTY ON PURPOSE, and kept as the extension point. It carried five words the
  // course did not teach (ขาว, หวัดดี, หรอ, อย่า, มารยาท); the trainer added all
  // five on 2026-09-05, so every row here became DEAD CODE rather than a
  // duplicate — the map below only fills gaps, so a row that data.js also has can
  // never fire, and this copy had already drifted (no romanisation on หรอ,
  // categories the trainer does not use). Their review caught it. Add a row here
  // only for a word the game prints that the curriculum genuinely lacks, and send
  // it to the trainer at the same time.
  const LBB_VOCAB = [];
  const LBB_WORDS = new Set(LBB_VOCAB.map(w => w[0]));
  let _thTok = null;
  function _thaiTokens(run) {
    try {
      if (!_thTok) {
        const m = {};
        for (const w of WORDS) m[w[0]] = w;
        for (const n of Object.values(NPCS)) if (n.th) m[n.th] = ["ent"];
        for (const w of LBB_VOCAB) if (!m[w[0]]) m[w[0]] = w;   // the game's own words, in the map so longest-match takes them whole
        _thTok = makeTokeniser(m, w => !!m[w] || LBB_WORDS.has(w));
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
    // Display names can COLLIDE (two hostesses both named Toey — rainbow_girls
    // and neon_palm). A flat map let the last one win everywhere, so the wrong
    // woman's face fronted the flyout and her poster path 404'd (mobile
    // playtest, 2026-08-17). Keep every candidate and prefer the one standing
    // in THIS room; fall back to the first otherwise.
    try {
      if (!_portIdx) {
        _portIdx = new Map();
        const put = (key, id) => {
          const arr = _portIdx.get(key) || [];
          arr.push(id); _portIdx.set(key, arr);
        };
        // both kinds indexed off the one table, so an emitter writing either
        // data-k resolves to the same portrait
        for (const [id, n] of Object.entries(NPCS)) put((n.patron ? "patron:" : "npc:") + n.name, id);
      }
      const cands = _portIdx.get(k + ":" + v);
      if (!cands || !cands.length) return null;
      if (cands.length > 1 && typeof G !== "undefined" && G) {
        const here = cands.find(id =>
          NPCS[id] && typeof _npcRoom === "function" && _npcRoom(id) === G.room);
        if (here) return here;
      }
      return cands[0];
    } catch (e) { return null; }
  }

  function _avatarSrc(src, cls, fallback) {
    const img = document.createElement("img");
    img.className = cls;
    img.src = src;
    img.alt = "";
    img.addEventListener("error", () => {
      // a missing photo-specific frame falls back to her standard portrait once,
      // then (if that's missing too) removes itself — the game never needs the art
      if (fallback && img.getAttribute("src") !== fallback) img.src = fallback;
      else img.remove();
    });
    return img;
  }
  // The generated renders are ~1.44 MB each at 832x1088; the largest portrait
  // this game ever shows is the 140px flyout header. So load the 384px WebP
  // thumbnail where one exists and keep the full render for nothing at all —
  // 14 KB against 1.44 MB, and 384px still covers 140 CSS px on a 3x phone.
  //
  // WHICH ids have one is data, not a guess: _THUMBS is baked from the same
  // renders list docs/world-export.json publishes. Guessing would cost a 404 per
  // pixel-art portrait, and 205 of the 277 are pixel art.
  //
  // The chain is thumb -> full -> remove, so a missing thumb degrades to exactly
  // today's behaviour. Shared verbatim with Second Road (HANDOFF §3).
  function _portraitSrc(id) {
    return (typeof _THUMBS !== "undefined" && _THUMBS.has(id))
      ? "portraits/thumb/" + id + ".webp"
      : "portraits/" + id + ".png";
  }
  function _avatar(id, cls) {
    return _avatarSrc(_portraitSrc(id), cls, "portraits/" + id + ".png");
  }

  // A texted selfie / paid pic can carry its own image (a distinct frame, not her
  // bust portrait): world.js data marks it with a `pic` stem, matched here by the
  // caption printed on the row. Presentation-only — a missing file just falls back.
  function _picFor(id, cap) {
    try {
      const n = NPCS[id];
      if (!n || !cap) return null;
      for (const pool of [n.paidPics, n.selfies, n.sponsorPics]) {
        if (!Array.isArray(pool)) continue;
        for (const e of pool) {
          const c = typeof e === "string" ? e : (e && e.cap);
          if (c === cap && e && e.pic) return e.pic;
        }
      }
    } catch (e) { /* ignore */ }
    return null;
  }
  // The «caption» on a gallery/photo row sits in the text node just after the name.
  function _capAfter(kw) {
    const t = kw.nextSibling;
    if (t && t.nodeType === 3) {
      const m = /«([^»]*)»/.exec(t.nodeValue.split("\n")[0]);
      if (m) return m[1];
    }
    return null;
  }

  // On the presence lines the engine's emoji becomes a portrait: the emoji
  // is the last token of the text node before each name, so strip it there
  // and drop the avatar in at the front of the name span.
  // The photo lightbox: tap a gallery photo / texted selfie to see it full-size.
  function _openPic(src, cap) {
    const ov = document.getElementById("pic-overlay");
    if (!ov || !src) return;
    if (!ov._wired) { ov.addEventListener("click", () => ov.classList.remove("open")); ov._wired = true; }
    ov.innerHTML = "";
    const img = document.createElement("img");
    img.src = src; img.alt = cap || "";
    ov.appendChild(img);
    if (cap) { const c = document.createElement("div"); c.className = "pic-cap"; c.textContent = cap; ov.appendChild(c); }
    ov.classList.add("open");
  }

  function _addAvatars(div, text) {
    if (!/^(Here: |Gallery — |📷 |Poster — )/.test(text)) return;
    // Gallery rows and texted selfies are the COLLECTION — their photos enlarge on
    // tap. The "Here:" avatars (staff + patrons) are just presence markers, inert.
    // A bar's promo poster enlarges too: it is a thing you walked over to look at,
    // and at 20px it would be a smudge of neon.
    const enlargeable = /^(Gallery — |📷 |Poster — )/.test(text);
    const isPoster = /^Poster — /.test(text);
    for (const kw of div.querySelectorAll('.kw[data-k="npc"], .kw[data-k="patron"]')) {
      const id = _portraitId(kw.dataset.k, kw.dataset.v);
      if (!id) continue;
      const prev = kw.previousSibling;
      if (prev && prev.nodeType === 3) {
        prev.nodeValue = prev.nodeValue.replace(/[^\s,]+\s*$/, "");
      }
      const pic = _picFor(id, _capAfter(kw));
      // A poster is its own artefact, not her portrait — art/posters/<id>.webp.
      // Falls back to her face if the bar has no poster art, same as everywhere
      // else here: missing art degrades, it never breaks.
      const av = isPoster
        ? _avatarSrc("art/posters/" + id + ".webp", "kw-av", "portraits/thumb/" + id + ".webp")
        : pic
        ? _avatarSrc("portraits/pics/" + pic + ".png", "kw-av", "portraits/" + id + ".png")
        : _avatar(id, "kw-av");
      if (enlargeable) {
        av.classList.add("pic-tap");
        av.style.cursor = "zoom-in";
        const cap = kw.dataset.v;
        av.addEventListener("click", e => { e.stopPropagation(); _openPic(av.getAttribute("src"), cap); });
      }
      kw.insertBefore(av, kw.firstChild);
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
        const cmd = lo.replace(/\s*[<…[].*$/, "");
        // bare PLAY fans out into the games actually on offer here
        if (cmd === "play") {
          const games = _playOptions();
          if (games.length) {
            return games.map(g => ({ t: "play " + g, c: "play " + g, go: true }));
          }
        }
        // mid-Connect-4, DROP fans out into the columns still open
        if (cmd === "drop") {
          const cols = _c4Choices();
          if (cols.length) {
            return cols.map(c => ({ t: "drop " + c, c: "drop " + c, go: true }));
          }
        }
        // mid-jackpot, FLIP fans out into the two legal moves ("3 4" · "7") —
        // the printed hint only tags the bare FLIP, so the numbers ride here
        if (cmd === "flip" && typeof _jpChoices === "function") {
          const moves = _jpChoices();
          if (moves.length) {
            return moves.map(m => ({ t: "flip " + m, c: "flip " + m, go: true }));
          }
        }
        // at a saleng cart, the open "BUY <item> FOR <lady>" hint fans out into
        // the cart's items so you don't have to type SOM TAM / FRUIT yourself
        if (cmd === "buy" && typeof _salengItems === "function") {
          const items = _salengItems();
          if (items.length) {
            return items.map(i => ({ t: "buy " + i + " for …", c: "buy " + i + " for ", go: false }));
          }
        }
        // The label for an open (placeholder) hint is just the verb, not the
        // whole raw hint text — "send …" not "send <amount> to <name> …",
        // which is what a long-press's flyout button used to show.
        return [{ t: open ? cmd : lo, c: cmd + (open ? " " : ""), go: !open }];
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
      const pat = null; // one cast since the patron fold — _findNpc resolves regulars
      if (!npc) {
        // Nobody here by that name — a patron who hopped off, or a story NPC named
        // only in passing. Offer to TALK, which reports plainly where they are or
        // that they've moved on. No ASK-about gossip routing: conversations start
        // with TALK now, and topics live inside the conversation (the chip bar),
        // not on a bystander's wheel.
        return [{ t: "talk to " + lo, c: "talk to " + lo, go: true }];
      }
      // Which verbs this character affords is engine logic — _npcActions(id, full)
      // is the single source of truth (shared with a future 2D tap UI). TALK opens
      // the conversation; the topic list + action-choices then live on the in-
      // conversation chip bar (see _chipSet), not here. This wheel just maps each
      // engine action-key to its label + command string (presentation).
      const _NPC_ACT = {
        talk:    l => ({ t: "talk",            c: "talk to " + l,      go: true }),
        examine: l => ({ t: "examine",         c: "x " + l,            go: true }),
        photo:   l => ({ t: "photo",           c: "photo " + l,        go: true }),
        buyher:  l => ({ t: "buy her a drink", c: "buy drink for " + l, go: true }),
        buyhim:  l => ({ t: "buy him a drink", c: "buy drink for " + l, go: true }),
        flirt:   l => ({ t: "flirt",           c: "flirt " + l,        go: true }),
        tip:     l => ({ t: "tip …",           c: `tip ${l} `,         go: false }),
        contact: l => ({ t: "contact",         c: "contact " + l,      go: true }),
        barfine: l => ({ t: "barfine",         c: "barfine " + l,      go: true }),
        hire:    l => ({ t: "hire",            c: "hire " + l,         go: true }),
        wai:     l => ({ t: "wai",             c: "wai " + l,          go: true }),
        follow:  l => ({ t: "eat with him",    c: "follow " + l,       go: true }),
        lesson:  l => ({ t: "take a lesson",   c: "lesson",            go: true }),
        cash:    l => ({ t: "cash, five percent", c: "cash ",           go: false }),
        motdinner: l => ({ t: "buy him dinner", c: "buy " + l + " dinner", go: true }),
      };
      const keys = typeof _npcActions === "function" ? _npcActions(npc || pat, full) : ["talk", "examine"];
      for (const key of keys) { const m = _NPC_ACT[key]; if (m) a.push(m(lo)); }
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
    // A single action on a QUICK tap runs directly — whether it fires (go/fn)
    // or opens for editing (a placeholder prefill like "SEND <amount> TO
    // <name>"). It used to require go/fn, so a prefill hint's one and only
    // possible action still forced a one-button flyout in the way, labelled
    // with the whole hint text ("send <amount> to <name> …") — an unnecessary
    // second tap, and confusing while it lasted (Dave's thumbs-only audit,
    // round 32, 2026-08-30: read as the hint doing nothing at all). A
    // long-press/right-click (`full`) still always shows the menu, even for
    // one item, since that view exists for discoverability.
    if (acts.length === 1 && !full) { _runAct(acts[0]); return; }
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
      head.appendChild(_avatar(pid, "fly-portrait"));
      const nm = document.createElement("span");
      nm.textContent = kwEl.dataset.k === "thai" ? NPCS[pid].name : kwEl.dataset.v;
      head.appendChild(nm);
      _fly.appendChild(head);
    }
    for (const act of acts) {
      const b = document.createElement("button");
      // open (prefill) actions get an ellipsis — unless the label already
      // carries one ("ask about …", "tip …"), which doubled it up
      // localise the display label (English cmd underneath is unchanged); the
      // ellipsis decision keys off the English label's shape, not the German
      b.textContent = _L(act.t) + (act.go || /…\s*$/.test(act.t) ? "" : " …");
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

  // The character wheel's DOM, opened against an arbitrary element and fed a
  // plain [{cmd,label}] — the compass's IN needs a picker and there is no
  // keyword to hang _openFly on. Same #flyout id, so it inherits the styling
  // and _closeFly still closes it.
  function _openListMenu(anchorEl, items) {
    _closeFly();
    if (!items || !items.length) return;
    _fly = document.createElement("div");
    _fly.id = "flyout";
    for (const it of items) {
      const b = document.createElement("button");
      b.textContent = _L(it.label);
      b.addEventListener("click", e => {
        e.stopPropagation();
        _closeFly();
        if (!_onCmd) return;
        _input.value = it.cmd;
        submit(_onCmd);           // a tap IS a typed command
      });
      _fly.appendChild(b);
    }
    document.body.appendChild(_fly);
    const r = anchorEl.getBoundingClientRect();
    const fw = _fly.offsetWidth, fh = _fly.offsetHeight;
    let x = Math.min(r.left, window.innerWidth - fw - 8);
    let y = r.bottom + 6;
    if (y + fh > window.innerHeight - 8) y = Math.max(8, r.top - fh - 6);
    _fly.style.left = Math.max(8, x) + "px";
    _fly.style.top = y + "px";
  }

  // A long night is thousands of commands; every line is a DOM node that never
  // left the scrollback, so memory (and layout cost) grew without bound. Keep a
  // generous window of recent lines and drop the oldest — plenty of history to
  // scroll, and the game state itself lives in G, never in the transcript.
  const _SCROLL_CAP = 800;
  function _trimScroll() {
    if (!_out) return;
    while (_out.childElementCount > _SCROLL_CAP) _out.removeChild(_out.firstChild);
  }

  function print(text, cls) {
    if (!_out) return;
    const div = document.createElement("div");
    div.className = "t-line" + (cls ? " t-" + cls : "");
    // The ASCII bar-mat map is monospace art — skip decorate() so bar-name kw
    // spans can't shift a glyph and break the alignment (see .t-map CSS: no-wrap,
    // horizontal-scroll, font shrinks to fit narrow screens).
    // The ASCII bar-mat map is monospace art — a screen reader spelling it out
    // glyph-by-glyph is noise, and the compass buttons + the Exits line already
    // carry proper labels, so keep it out of the live-region announcement.
    if (cls === "map") { div.textContent = text; div.setAttribute("aria-hidden", "true"); }
    else div.innerHTML = decorate(text);
    _addAvatars(div, text);
    _out.appendChild(div);
    _trimScroll();
    _out.scrollTop = _out.scrollHeight;
  }

  function echo(cmd) {
    const div = document.createElement("div");
    div.className = "t-line t-echo";
    // The `info…` fanout prefills a SENTINEL so engineComplete can offer eleven
    // readouts from one chip slot. The engine strips it before parsing; the ECHO
    // did not, so tapping DIAGNOSE printed "❯ __info diagnose" and looked to a
    // phone player like something had broken (round 24, Pauline). It is
    // plumbing, and plumbing does not belong in the transcript.
    div.textContent = "❯ " + String(cmd).replace(/^__info\b\s*/i, "");
    _out.appendChild(div);
    _trimScroll();
    return div;   // submit() anchors the scroll to it — see _scrollToNew
  }

  // Where to leave the view after a command. Pinning to the BOTTOM is right for
  // a one-line reply and wrong for a wall: a night ending prints the barfine,
  // the wake-up, the rent, the hangover and the new room description at once,
  // and jumping to the end scrolls the line you were reading off the top of the
  // screen. The IF convention is the opposite — put the START of the new text
  // at the top and read down.
  //
  // One expression does both, because the clamp IS the short-output case: a
  // reply that doesn't fill the viewport can't be scrolled that far, so it
  // settles at the bottom exactly as before, with the previous exchange still
  // in view above it.
  // Anchoring EVERY overflow was worse than the problem it fixed. Output that
  // merely tipped past the viewport got the same jump as a night ending, so two
  // commands in a row could behave completely differently depending on how much
  // the game happened to print — which reads as the scrollback moving on its
  // own. The anchor is now reserved for output that is unambiguously a wall.
  const WALL_SCREENS = 1.5;
  function _scrollToNew(anchor) {
    if (!_out) return;
    const bottom = _out.scrollHeight - _out.clientHeight;
    if (!anchor || !anchor.isConnected) { _out.scrollTop = bottom; return; } // trimmed away
    const delta = anchor.getBoundingClientRect().top - _out.getBoundingClientRect().top;
    const top = _out.scrollTop + delta;      // the scrollTop that puts the echo at the top
    const fresh = _out.scrollHeight - top;   // everything printed this turn
    if (fresh < _out.clientHeight * WALL_SCREENS) { _out.scrollTop = bottom; return; }
    _out.scrollTop = Math.min(top, bottom);
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

  // The bar bell FAB: a persistent tap-to-ring glyph, shown only while you're
  // in a bar/go-go. Reads engine state the way decorate does — no rules here;
  // the tap just submits "ring bell" like any command.
  // Refresh the floating action buttons against live game state: the bell shows
  // in bars, the message glyph shows while any text is unread. Called after every
  // command (the room or inbox may have changed) and at boot.
  function _updateFabs() {
    const bell = document.getElementById("bell-fab");
    if (bell) {
      let inBar = false;
      try { inBar = typeof _inBar === "function" && !!_inBar(); } catch (e) {}
      bell.classList.toggle("show", inBar);
    }
    const msg = document.getElementById("msg-fab");
    if (msg) {
      let unread = 0;
      try { unread = typeof _unreadCount === "function" ? _unreadCount() : 0; } catch (e) {}
      msg.classList.toggle("show", unread > 0);
    }
    _updateNavFab();
    _parkFabs();
  }

  // Sit the floating buttons just above the chip bar, measured rather than
  // guessed: the bar's height moves with the font-size control (the Aa button
  // is the single most-used accessibility affordance in this game), so a fixed
  // rem offset puts the bell inside the chips at one size and halfway up the
  // screen at another. See the CSS note on #fab-stack for why they are at the
  // bottom at all — they used to float over the scrolling transcript and cover
  // whatever tappable words scrolled underneath them (round 24, Pauline).
  function _parkFabs() {
    const stack = document.getElementById("fab-stack");
    const chips = document.getElementById("chips");
    if (!stack || !chips) return;
    // Measure to the chip bar's TOP, not its height: below it sits the input
    // row too, and offsetting by the bar alone parked the bell inside the chips.
    const top = chips.getBoundingClientRect().top;
    stack.style.bottom = Math.round(window.innerHeight - top + 12) + "px";
    // …and RESERVE the strip rather than float over it. Moving these buttons
    // was only half the fix: anywhere they sit, they sit on top of a scrolling
    // transcript, and any tappable word that scrolls underneath is a word the
    // player cannot tap — which is exactly what happened, intermittently, which
    // is worse than always. The transcript auto-scrolls to the bottom, so
    // padding it by the stack's height simply keeps the newest line above them.
    // Costs nothing when no fab is up.
    const out = document.getElementById("term-out");
    if (!out) return;
    const anyUp = [...stack.children].some(c => getComputedStyle(c).display !== "none");
    out.style.paddingBottom = anyUp ? (stack.getBoundingClientRect().height + 16) + "px" : "";
    // …and reserve the strip HORIZONTALLY too, not just vertically. The bottom
    // padding only protects the tail of the transcript — it assumes the whole
    // thing overflows and auto-scrolls to bottom, so the reserved gap lands
    // under the fabs. A single long print (the vacation-end narrative is the
    // worst of them) can fit inside #term-out without ever needing to scroll,
    // in which case the fab-stack — fixed at the viewport's right edge — sits
    // on top of whatever text happens to reach that column, mid-paragraph, at
    // any height (Reg the publican, round 32, 2026-08-30: the bell clipped
    // "...the stre[et]" dead in the middle of the closing narration, nowhere
    // near the transcript's actual bottom). A permanent right margin the width
    // of the stack means text can never flow under it, regardless of scroll
    // position — the same "reserve, don't float over" fix as the vertical one.
    out.style.paddingRight = anyUp ? (stack.getBoundingClientRect().width + 26) + "px" : "";
  }

  // The street compass: N/E/S/W plus a flashlight in the middle, in the same
  // stack slot as the bell (the bell shows inside a venue, this outside one, so
  // they never collide). Which arrows are live comes from the engine's
  // _navDirs() — term.js renders the wheel and must not know the map (rail 1).
  // Dead directions are DIMMED rather than removed, so the rose keeps its shape
  // and your thumb learns one position per direction.
  function _updateNavFab() {
    const nav = document.getElementById("nav-fab");
    if (!nav) return;
    let show = false, dirs = [], lit = false;
    try {
      show = typeof _navHere === "function" && !!_navHere();
      dirs = show && typeof _navDirs === "function" ? _navDirs() : [];
      lit = typeof G !== "undefined" && !!G && !!G.lightOn;
    } catch (e) { show = false; }
    nav.classList.toggle("show", show);
    if (!show) return;
    for (const b of nav.querySelectorAll("button[data-nav]")) {
      const d = b.dataset.nav;
      if (d === "light") {
        b.classList.toggle("on", lit);
        b.title = lit ? "Turn the flashlight off" : "Turn the flashlight on";
        continue;
      }
      if (d === "in") {
        let ways = [];
        try { ways = typeof _navEnter === "function" ? _navEnter() : []; } catch (e) {}
        b.disabled = !ways.length;
        b.title = !ways.length ? "Nothing to go into here"
          : ways.length === 1 ? "Into " + ways[0].label
          : "Hold for the " + ways.length + " places you can go into";
        continue;
      }
      b.disabled = dirs.indexOf(d) < 0;
      b.title = b.disabled ? "No way through that side" : "Go " + d.toUpperCase();
    }
  }

  // Context chips (the fourth surface): rebuild the quick-command bar from the
  // engine's _chipSet() each turn, so the buttons match where you are. Pass a
  // custom [{cmd,label}] to override (the boot continue-prompt does). A cmd ending
  // in a space prefills and waits for an object; a bare cmd submits immediately.
  // The four cardinals AND `in` live on the street compass (the fab wheel), so
  // showing them as chips too spends four slots on buttons already under the
  // player's thumb. Filtered HERE and not in _chipSet(), which is engine-side:
  // the compass is a term.js affordance, and a served or 2D frontend that never
  // draws one would otherwise lose its only tap route to a cardinal exit. The
  // engine keeps offering all of them; this view drops what it already shows.
  // (It also keeps the soak honest — it reads _chipSet directly.)
  // The street ATM offers four chips — ฿1k, ฿5k, ฿10k, balance — which is a
  // third of the bar spent on one machine you use a few times a night. Collapse
  // them into one ATM chip that opens the same four on a press.
  //
  // Same split as the compass: the ENGINE still offers all four (a frontend
  // with no menus keeps every option as its own button); this view folds them
  // because it has somewhere to put them. The commands are untouched, so the
  // typed path and the transcript read identically either way.
  const _ATM_CMDS = ["withdraw 1000", "withdraw 5000", "withdraw 10000", "check balance"];
  // A chip whose cmd ends in a space is a PREFILL — it fills the input and waits
  // for typing, which on a phone is a dead end (thumbs-only playtest 2026-08-22:
  // three of a bar's six verbs were unreachable). Fan it out into a tap menu from
  // the engine's own completion pool — the same source the keyboard's autocomplete
  // uses, so the two surfaces can never disagree. Empty pool → the old prefill.
  function _prefillMenu(cmd) {
    let opts = [];
    try { opts = (typeof engineComplete === "function" ? engineComplete(cmd) : []) || []; } catch (e) { opts = []; }
    return opts.slice(0, 12).map(o => {
      const full = /\s$/.test(cmd) ? cmd + o : cmd + " " + o;
      // a completion that is itself a prefix ("lady drink for") keeps the keyboard path
      return { cmd: full, label: o };
    });
  }
  function _foldAtmChips(chips) {
    const atm = chips.filter(c => _ATM_CMDS.indexOf(String(c.cmd || "")) >= 0);
    if (atm.length < 2) return chips;              // nothing worth folding
    const out = [];
    let placed = false;
    for (const c of chips) {
      if (_ATM_CMDS.indexOf(String(c.cmd || "")) < 0) { out.push(c); continue; }
      if (placed) continue;                        // the rest fold into the first
      placed = true;
      out.push({ cmd: "__atm", label: "ATM", menu: atm });
    }
    return out;
  }

  function _dropCompassChips(chips) {
    let up = false;
    try { up = typeof _navHere === "function" && !!_navHere(); } catch (e) {}
    if (!up) return chips;
    const CARD = { n: 1, s: 1, e: 1, w: 1, in: 1 };
    return chips.filter(c => !CARD[String(c.cmd || "").trim().toLowerCase()]);
  }

  function _renderChipMenu(set, cmd) {
    const c = set.find(x => x.cmd === cmd);
    return (c && c.menu) || [];
  }

  function _renderChips(custom) {
    const box = document.getElementById("chips");
    if (!box) return;
    let set = custom;
    if (!set) { try { set = typeof _chipSet === "function" ? _chipSet() : []; } catch (e) { set = []; } }
    if (!custom) set = _foldAtmChips(_dropCompassChips(set)); // wheel + ATM folding
    box.innerHTML = "";
    for (const { cmd, label, kind } of set) {
      const b = document.createElement("button");
      b.className = kind === "reply" ? "chip chip-reply" : "chip";
      b.dataset.cmd = cmd;
      b.textContent = _L(label || cmd); // German display label; the cmd submitted stays English
      b.addEventListener("click", ev => {
        // stop the click here: the document-level "clicked outside, close the
        // flyout" listener would otherwise fire on the very click that opened
        // this menu and shut it on the way up. (The compass takes the same
        // problem from the other end, with an #nav-fab exemption.)
        if (cmd === "__atm") { ev.stopPropagation(); _openListMenu(b, _renderChipMenu(set, cmd)); return; }
        if (cmd.endsWith(" ")) {
          const menu = _prefillMenu(cmd);
          if (menu.length) { ev.stopPropagation(); _openListMenu(b, menu); return; }
          _input.value = cmd; _input.focus(); _refreshSuggest();
        }
        else { _input.value = cmd; submit(_onCmd); }
      });
      box.appendChild(b);
    }
  }

  function submit(onCommand) {
    const cmd = _input.value.trim();
    if (!cmd) return;
    _closeFly(); // a wheel left open over the transcript outlives the moment it was for (mobile playtest 2026-08-22)
    const anchor = echo(cmd);
    _history.push(cmd);
    _histIdx = _history.length;
    _input.value = "";
    _tabBase = null;
    _tabIdx = -1;
    _refreshSuggest();
    onCommand(cmd);
    _updateFabs(); // the room/inbox may have changed — show/hide the bell & message glyphs
    if (typeof _updateScene === "function") _updateScene(); // v0 scene panel
    _renderChips(); // …and re-match the quick-command chips to the new context
    _scrollToNew(anchor); // read from the top of what just arrived, not the end
  }

  function _wireNavFab() {
    const nav = document.getElementById("nav-fab");
    if (!nav) return;
    // IN is the one button with two behaviours, so it needs the same press
    // vocabulary the keywords use: tap to go, hold (or right-click) to pick.
    let inTimer = null, inHeld = false;
    const ways = () => { try { return typeof _navEnter === "function" ? _navEnter() : []; } catch (e) { return []; } };
    const pick = b => { const w = ways(); if (w.length) _openListMenu(b, w); };

    nav.addEventListener("pointerdown", e => {
      const b = e.target.closest('button[data-nav="in"]');
      if (!b || b.disabled) return;
      inHeld = false;
      clearTimeout(inTimer);
      inTimer = setTimeout(() => { inHeld = true; pick(b); }, 500);
    });
    nav.addEventListener("pointerup", () => clearTimeout(inTimer));
    nav.addEventListener("pointercancel", () => clearTimeout(inTimer));
    nav.addEventListener("contextmenu", e => {
      const b = e.target.closest('button[data-nav="in"]');
      if (!b || b.disabled) return;
      e.preventDefault();
      pick(b);
    });

    nav.addEventListener("click", e => {
      const b = e.target.closest("button[data-nav]");
      if (!b || b.disabled) return;
      const d = b.dataset.nav;
      if (!_onCmd) return;
      if (d === "in") {
        if (inHeld) { inHeld = false; return; }   // the hold already opened the list
        const w = ways();
        if (!w.length) return;
        if (w.length > 1) { pick(b); return; }    // a soi of bars: ask which
        _input.value = w[0].cmd;                  // one door: just go in
        submit(_onCmd);
        return;
      }
      const lit = typeof G !== "undefined" && G && G.lightOn;
      _input.value = d === "light" ? (lit ? "light off" : "light on") : "go " + d;
      submit(_onCmd);   // a tap IS a typed command (tap-echo invariant)
    });
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

    // the bar bell: tap to ring, no keyboard needed
    const bellFab = document.getElementById("bell-fab");
    if (bellFab) bellFab.addEventListener("click", () => {
      _input.value = "ring bell";
      submit(onCommand);
    });

    // the message glyph: tap to read your unread texts (CHECK MESSAGES), which
    // prints them and marks them read — so the glyph hides itself afterward
    const msgFab = document.getElementById("msg-fab");
    if (msgFab) msgFab.addEventListener("click", () => {
      _input.value = "check messages";
      submit(onCommand);
    });

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
      // #nav-fab opens its own picker (the compass IN button), and the click
      // that opens it bubbles to here — without this it closed on the way up.
      if (_fly && !_fly.contains(e.target) && !e.target.closest(".kw") &&
          !e.target.closest("#nav-fab")) _closeFly();
    });

    _input.focus();
    _wireNavFab();
    _updateFabs(); // in case we boot straight into a bar / with unread texts (restored save)
    if (typeof _updateScene === "function") _updateScene(); // v0 scene panel
    _renderChips(); // first paint of the context chips (main.js re-renders post-boot)
  }

  return { init, print, decorate, kwActions: _kwActions, renderChips: _renderChips, picFor: _picFor,
    // RESUME (main.js) imports a character outside the normal submit path, so it
    // has to refresh the bell/message glyphs itself — it called _updateFabs()
    // bare and threw ReferenceError every time, leaving the PREVIOUS character's
    // chips and FABs on screen (persistence playtest 2026-08-23: a discarded
    // life's "pay ฿15" fare chip sat over a character who owed nothing).
    updateFabs: _updateFabs,
    // v0 scene panel (scene.js): reuse the bust builder + character wheel, and
    // submit a typed command exactly as a chip tap would (tap-echo invariant).
    avatar: _avatar, openFly: _openFly,
    submitCmd: (cmd) => { if (!_onCmd) return; _input.value = cmd; submit(_onCmd); } };
})();
