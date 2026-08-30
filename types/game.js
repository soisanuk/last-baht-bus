// Type definitions for the game's authored data shapes. JSDoc only — this file
// has no runtime content, is never in any <script> tag or vm-test load list,
// and is read exclusively by the editor (see jsconfig.json).
//
// WHY THESE FIVE AND NOT MORE: these are the shapes a CONTENT author types by
// hand, over and over, where a mistake is silent. Misspell `notFlags` as
// `noFlags` on a dialogue node and nothing throws — the gate just never fires,
// and the line leaks into a state it was written to stay out of. That class of
// bug is what an editor can actually catch for free.
//
// Field lists below were derived by surveying the live data, not by reading the
// docs, and each optional field carries how many records actually use it — so
// the rare ones are visibly rare rather than looking like equals of `name`.
// Re-survey with: node tools/probe.mjs 'Object.values(ROOMS)…' (see git log).

/**
 * The whole mutable game state — the single object `serializeGame`/
 * `deserializeGame` round-trip, and the one CLAUDE.md's "a new G field needs no
 * backfill, just add it to newGame()" rule is about.
 *
 * DERIVED, never hand-listed. G carries 100+ fields; a typedef transcribing
 * them would be a second source of truth that drifts from `newGame()` the first
 * time anyone adds a field — precisely the duplicate-spec problem this codebase
 * avoids elsewhere (one `_qvMenu()` so the card and the till cannot disagree).
 * `newGame()` returns G, so the editor can infer the shape from the constructor
 * itself and it can never fall out of date.
 * @typedef {ReturnType<typeof newGame>} GameState
 */

/**
 * The baton handed to Second Road and back (docs/second-road-plan.md): an
 * explicit SUBSET of the save, not the save — a full state carries a body in a
 * night (hunger, battery, the pending modal gates) that a macro turn cannot
 * honour. The travelling fields are listed in `BATON_FIELDS`.
 * @typedef {Partial<GameState> & { v: number }} Baton
 */

/**
 * A room. `exits` is direction → roomId ("in"/"out" for venues); anything a
 * player can walk into is one of these.
 * @typedef {Object} Room
 * @property {string} name
 * @property {string} region
 * @property {string} desc
 * @property {Object.<string, string>} exits          direction → roomId
 * @property {string} [bar]                           trading name — the venue label (119)
 * @property {string[]} [revisit]                     pooled re-entry lines, not the full desc (95)
 * @property {"beer"|"pub"|"soi6"|"gents"|"gogo"|"club"|"host"} [barType]  venue class — drives DRINK_MULT/RENT_MULT/closing (87)
 * @property {string[]} [venues]                      roomIds you can step INTO from here (56)
 * @property {Object.<string, any>} [reads]           EXAMINE fixtures: noun → string | gated node[] (56)
 * @property {boolean} [motosai]                      a bike stand is here (39)
 * @property {string} [busStop]                       name of the baht-bus line serving it (32)
 * @property {boolean} [outlet]                       you can CHARGE PHONE here (25)
 * @property {boolean} [massage]                      (19)
 * @property {boolean} [dark]                         needs the phone torch (17)
 * @property {boolean} [seven]                        a 7-Eleven counter (15)
 * @property {boolean} [pool]                         (11)
 * @property {boolean} [atm]                          (11)
 * @property {boolean} [liveMusic]                    (9)
 * @property {boolean} [food]                         (6)
 * @property {boolean} [darts]                        (6)
 * @property {string} [sign]                          key into SIGNS (6)
 * @property {string} [lateDesc]                      after-hours face of the room (6)
 * @property {boolean} [water]                        you can SWIM (5)
 * @property {boolean} [soapy]                        (3)
 * @property {boolean} [musicEveryNight]              (2)
 * @property {string} [owner]                         (2)
 * @property {boolean} [lockIn]                       Darkside bars that bolt the door instead of closing (2)
 * @property {boolean} [hostBar]                      (1)
 * @property {boolean} [shop]                         (1)
 * @property {boolean} [vip]                          (1)
 * @property {boolean} [closed]                       (1)
 */

/**
 * One dialogue node. First MATCHING entry wins (see `_pickDialogue`), so order
 * is meaningful: put the deeper/gated version above the shallower fallback, and
 * keep the last entry ungated or the character can fall through to nothing.
 * @typedef {Object} DialogueNode
 * @property {string} text                        the full line (2050 — the only required field)
 * @property {string} [topic]                     the ASK key; absent = the topicless greeting (1586)
 * @property {string} [short]                     the terse retell — nobody repeats in full (824)
 * @property {string[]} [notFlags]                suppressed while ANY of these flags is set (391)
 * @property {string} [rom]                       romanisation of `th` (354)
 * @property {string} [th]                        Thai greeting rendered above the line (351)
 * @property {function(any, GameState): boolean} [when]  arbitrary gate on conversation state + G (279)
 * @property {{key: string, q: string}} [asks]    a question put to the PLAYER (175)
 * @property {string[]} [req]                     requires ALL of these flags (78)
 * @property {string[]} [sets]                    flags this node sets when delivered (71)
 * @property {boolean} [chip]                     false hides it from the chip bar (quest-driven nodes) (37)
 * @property {number} [bond]                      minimum `_bondTier` to reach it (35)
 * @property {function(any, GameState): void} [fx]      side effect, on FIRST delivery only (27)
 * @property {Array<any>} [choices]               player-side action choices this beat offers (12)
 * @property {string} [deflect]                   (7)
 * @property {string} [gives]                     itemId handed over (3)
 * @property {function(any, GameState): void} [fxAlways]  side effect on EVERY delivery (2)
 */

/**
 * A character. Presence is resolved by `_npcRoom(id)`/`_npcWhere(id)` — never
 * read `.room` directly where presence matters, or a schedule (bars/shuttle/
 * until/hops) silently doesn't apply.
 * @typedef {Object} NPC
 * @property {string} name
 * @property {string} emoji
 * @property {string} room                        home room — the DEFAULT, not the answer (see _npcRoom)
 * @property {string} desc
 * @property {DialogueNode[]} dialogue
 * @property {string} [th]                        Thai name (313)
 * @property {boolean} [filler]                   generated from the _FILLER_* tables, not hand-authored (209)
 * @property {string} [look]                      portrait-generator prompt line (87)
 * @property {"he"|"she"|"they"} [pronoun]        (65)
 * @property {string[]} [selfies]                 caption pool for texted selfies (60)
 * @property {string} [title]                     description that resolves to them before you know the name (33)
 * @property {boolean} [hops]                     drifts the manor early doors (27)
 * @property {number} [c4]                        Connect 4 search depth — the skill tier (26)
 * @property {number} [age]                       (24)
 * @property {string} [nat]                       (24)
 * @property {boolean} [patron]                   a rail regular: no NPC_ROLES, so all lady-logic ignores them (24)
 * @property {string} [type]                      behavioural archetype (lazy/operator/sponsor/kin/…) (19)
 * @property {string} [personality]               (14)
 * @property {string} [origin]                    the character-creation archetype they embody (8)
 * @property {string[]} [bars]                    works these on alternate nights: bars[day % len] (7)
 * @property {boolean} [ladyboy]                  (7)
 * @property {boolean} [manager]                  hired help — deliberately NOT in NPC_ROLES (4)
 * @property {string} [orientation]               (3)
 * @property {boolean} [house]                    (3)
 * @property {string[]} [haunts]                  regions the drift may wander (3)
 * @property {string[]} [avoids]                  bars they never enter — creditors, a ban, history (2)
 * @property {number} [until]                     nightTurn they go home at — a stated habit, made true (2)
 * @property {number} [from]                      nightTurn before which they aren't out yet (1)
 * @property {boolean} [offmap]                   exists for the phone; never stands in a room (2)
 * @property {{flag: string, room: string}} [movesTo]     the world moved them, permanently, once a flag is set (1)
 * @property {{after: number, to: string}} [shuttle]      wheeled to another bar after an hour (1)
 * @property {number[]} [days]                    weekday indices they drink on (G.day % 7) (1)
 * @property {string[]} [rage]                    topics that turn them belligerent (1)
 * @property {boolean} [sandbox]                  not part of the opening quest's street (1)
 * @property {boolean} [protected]                (1)
 */

/**
 * A quest. The `doneFlag` design is deliberate: quests OBSERVE the world rather
 * than owning it, so any mechanic becomes quest-completable with no
 * quest-specific code. Keep it that way.
 * @typedef {Object} Quest
 * @property {string} name
 * @property {string} giver                       npcId whose dialogue surfaces the offer
 * @property {string} desc                        the action + its tappable CAPS command; NO baked-in venue (see _questWhere)
 * @property {string[]} deps                      questIds that must be done first
 * @property {string} doneFlag                    set anywhere in the world = complete
 * @property {number} reward                      baht
 * @property {string} [at]                        npcId OR roomId — resolved to a LIVE location by _questWhere (32)
 * @property {string[]} [reqFlags]                world-state gates the dep chain can't express (11)
 * @property {number} [trust]                     minimum conversation trust before the giver offers (9)
 * @property {boolean} [vignette]                 a quiet origin scene: hidden from the journal and HINT (8)
 * @property {string} [item]                      itemId the quest hands over (4)
 * @property {boolean} [noNudge]                  (1)
 */

/**
 * An item. `location` is a roomId, "inventory" (starts on you), or null (not in
 * play yet — a `reveal:` on a reads node can place it later).
 * @typedef {Object} Item
 * @property {string} name
 * @property {string[]} aliases                   every noun a player might type for it
 * @property {boolean} portable
 * @property {string|null} location
 * @property {string} desc
 * @property {boolean} [keepsafe]                 quest/clue — DROP warns, and a dropped one shows in QUESTS (12)
 * @property {string} [kind]                      "food" etc. — drives GIVE reactions (8)
 * @property {boolean} [bottle]                   glass Auntie Nok will buy (4)
 * @property {string} [readTh]                    Thai body text for READ (1)
 * @property {string} [readEn]                    …and its translation (1)
 * @property {string} [sight]                     (1)
 */

// (No exports: these are ambient in the shared script scope, exactly like the
// globals they describe. `types/` is outside every runtime load list.)
