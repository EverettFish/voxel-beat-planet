// STARTER — copy to js/scene-manifest.js and replace EVERYTHING below with decisions made for this one song.
// The two districts / one ring / two chapters here exist only so the engine boots; a finished project has
// 10–16 districts, 1–3 rings and 4–8 chapters. Radians everywhere. lon = 0 faces the default camera.
const MB_CLIMATE_STATES = {
  // Every chapter must carry the same keys. sky*/hazeCol/cloudCol = display colours 0..1; sunCol/ambCol = light multipliers.
  open:  { skyTop: [0.30, 0.58, 0.92], skyHor: [0.74, 0.87, 0.97], sunCol: [1.10, 1.02, 0.88], ambCol: [0.50, 0.54, 0.60], sunElev: 0.75, haze: 0.06, hazeCol: [0.85, 0.92, 1.0], cloud: 0.35, cloudCol: [1, 1, 1], wind: 0.35, leaf: 0.2, rain: 0, snow: 0, wet: 0, frost: 0, ice: 0, lights: 0, stars: 0, aurora: 0, canopy: 0, bare: 0, mist: 0 },
  close: { skyTop: [0.05, 0.07, 0.20], skyHor: [0.22, 0.26, 0.46], sunCol: [0.38, 0.46, 0.72], ambCol: [0.40, 0.45, 0.62], sunElev: 0.45, haze: 0.15, hazeCol: [0.40, 0.46, 0.66], cloud: 0.30, cloudCol: [0.40, 0.44, 0.60], wind: 0.2, leaf: 0, rain: 0, snow: 0, wet: 0, frost: 0, ice: 0, lights: 1, stars: 1, aurora: 0, canopy: 0, bare: 0, mist: 0 },
};
window.MB_SCENE = {
  id: "starter", title: "Starter Planet", seed: 1234,
  ui: { glyph: "◎", headline: "Replace me", sub: "One sentence that says what this world is.", track: "Title · Artist",
        theme: { ink: "#14202e", "ink-hi": "#22384e", "ink-lo": "#0a1018", paper: "#eef3f8", accent: "#e0683a", accent2: "#f0b64a", cool: "#5b9bd0" } },
  premise: "",
  districts: [
    { id: "hero",  name: "Hero",  lat: 0.20,  lon: 0.0, r: 0.28, flat: 0.8, react: 0.25 },
    { id: "water", name: "Water", lat: -0.20, lon: 2.6, r: 0.24, flat: 0.95, react: 0.2, water: 0.15 },
  ],
  rings: [{ id: "loop", name: "Loop", pole: [0.2, 0.93, 0.3], half: 0.03, react: 0.03 }],
  waveSources: ["hero", "water"],
  duration: 180,
  chapters: [
    { id: "open",  name: "Opening", at: 0,   blend: 6,  state: MB_CLIMATE_STATES.open },
    { id: "close", name: "Closing", at: 120, blend: 14, state: MB_CLIMATE_STATES.close },
  ],
  audioBindings: {}, heroEvents: [], cameraTargets: ["hero"],
};
