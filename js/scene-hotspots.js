// v1 hotspots (docs/2d-v1-spec.md): tap regions over the painted objects in
// BESPOKE room art. Keyed by the art key scene.js computes ("rooms/<roomId>" —
// never "regions/<slug>": region images are shared across rooms, so a painted
// door would mean a different exit in each). Coordinates are PERCENT OF THE
// IMAGE (not the container) — they survive responsive scaling because scene.js
// maps them through the object-fit:cover transform. cmd is a typed command the
// parser answers (a contextual refusal is fine; a "didn't understand" is a
// broken promise — tests/js/hotspots.test.js enforces it). label is the hover/
// pulse caption, run through _L for the German build.
//
// Authored (2026-08) against the real shipped renders in web/art/rooms/ for the
// Soi 6 pocket's bespoke-art rooms (the 7 barType:"soi6" bars + queen_vic +
// qv_room) using localStorage.lbb_v1_author="1" (console click-drag logger, see
// scene.js) plus a screenshot pass with lbb_v1_on="1" to verify every box sits
// on the painted object it names.
const SCENE_HOTSPOTS = {
  "rooms/queen_vic": [
    { box: [3, 46.1, 65, 39.3], cmd: "buy beer", label: "the bar" },
    { box: [84, 15.4, 15, 21.2], cmd: "time", label: "the wall clock" },
    { box: [62, 13.0, 19, 66.9], cmd: "go up", label: "the door" },
  ],
  "rooms/qv_room": [
    { box: [0, 36, 57, 63], cmd: "sleep", label: "the bed" },
    { box: [58, 18, 38, 45], cmd: "balcony", label: "the balcony" },
    { box: [87, 20, 12, 26], cmd: "watch tv", label: "the flatscreen" },
    { box: [82, 46, 18, 27], cmd: "open fridge", label: "the mini-fridge" },
  ],
  "rooms/pink_lotus": [
    { box: [29.1, 39.4, 39.3, 43.8], cmd: "buy beer", label: "the bar" },
  ],
  "rooms/orchid_room": [
    { box: [70.9, 50.0, 12.9, 20.0], cmd: "buy beer", label: "the bar" },
    { box: [59.4, 47.5, 8.1, 35.7], cmd: "go up", label: "the door" },
  ],
  "rooms/golden_dragon": [
    { box: [36, 30.3, 32, 37.0], cmd: "buy beer", label: "the bar" },
  ],
  "rooms/sunset_dreams": [
    { box: [41.0, 50.6, 27.4, 30.0], cmd: "buy beer", label: "the bar" },
    { box: [72.2, 43.2, 13.7, 38.1], cmd: "go up", label: "the door" },
  ],
  "rooms/kitten_corner": [
    { box: [53.0, 33.2, 19.7, 47.5], cmd: "go up", label: "the door" },
  ],
  "rooms/cherry_pop": [
    { box: [53.8, 64.2, 11.2, 9.4], cmd: "eat cherries", label: "the cherry bowl" },
    { box: [72.6, 38.2, 21.8, 43.3], cmd: "buy beer", label: "the bar" },
  ],
  "rooms/ruby_kiss": [
    { box: [43.6, 61.3, 30.8, 13.9], cmd: "buy beer", label: "the bar" },
    { box: [33.3, 45.6, 9.4, 35.0], cmd: "go up", label: "the door" },
  ],
};
