// Single source of truth for every game tunable — no magic numbers anywhere else.
export const WORLD_SEED = 20260703;

export const TERRAIN = Object.freeze({
  SIZE: 1536,
  SAMPLES: 257,
  AMPLITUDE: 38,
  HQ_FLAT_RADIUS: 45,
  ROCKS_SMALL: 400,
  ROCKS_BIG: 40,
  WRECKS: 5
});

export const DAY = Object.freeze({
  LENGTH_S: 600,
  DAY_FRACTION: 0.6
});

export const PHYS = Object.freeze({
  GRAVITY: -6.0,
  FIXED_DT: 1 / 60,
  MAX_SUBSTEPS: 3,
  SUS_REST: 0.45,
  SUS_STIFF: 30,
  SUS_DAMP: 4.5,
  SUS_TRAVEL: 0.35,
  WHEEL_RADIUS: 0.34,
  WHEEL_FRICTION: 1.6
});

export const ROVER = Object.freeze({
  MAX_SPEED: 11,
  ENGINE_ACCEL: 7.5,
  BRAKE_FORCE_MULT: 2.2,
  MAX_PARTS: 24,
  MIN_WHEELS: 3,
  MAX_WHEELS: 8,
  GRID_CELL: 0.5,
  PHYS_NEAR: 60,
  PHYS_FAR: 75,
  FLIP_COOLDOWN_S: 5,
  STUCK_SPEED: 0.5,
  STUCK_TIME_S: 3
});

export const BATTERY = Object.freeze({
  BASE_CAP: 30,
  PACK_CAP: 150,
  IDLE_DRAIN: 0.15,
  DRIVE_DRAIN: 0.9,
  DRILL_DRAIN: 2.5,
  SOLAR_PANEL_RATE: 0.7
});

export const CHARGE = Object.freeze({
  HQ_RATE: 12,
  PORT_RANGE: 12,
  SNAP_RADIUS: 3,
  SELL_RADIUS: 14,
  TANKER_RATE: 8,
  TANKER_RANGE: 6,
  TANK_CAP_PER_PART: 500,
  TANK_REFILL_MULT: 2
});

export const ORE_TYPES = Object.freeze({
  iron: Object.freeze({ value: 10, color: 0xb0653a }),
  nickel: Object.freeze({ value: 25, color: 0x9fb8c8 }),
  platinum: Object.freeze({ value: 60, color: 0xe8e4da })
});

export const DEPOSIT = Object.freeze({
  COUNT: 28,
  RINGS: Object.freeze({
    iron: Object.freeze({ n: 12, min: 120, max: 350, rich: Object.freeze([30, 50]) }),
    nickel: Object.freeze({ n: 10, min: 300, max: 550, rich: Object.freeze([25, 40]) }),
    platinum: Object.freeze({ n: 6, min: 500, max: 720, rich: Object.freeze([15, 30]) })
  }),
  DRILL_RANGE: 7
});

export const ORE = Object.freeze({
  DRILL_SECONDS_PER_CHUNK: 1.5,
  PICKUP_RANGE: 8,
  RADAR_BASE: 160,
  RADAR_SCOUT: 480
});

export const CAPS = Object.freeze({
  MAX_GROUND_ORE: 40,
  MAX_FLEET_TOTAL: 12,
  CARGO_PER_BAY: 6
});

export const ECON = Object.freeze({
  START_CREDITS: 600,
  SELL_INTERVAL: 0.35,
  SCRAP_REFUND: 0.5
});

export const NET = Object.freeze({
  POSE_HZ: 8,
  INTERP_DELAY_MS: 180,
  SNAP_DIST: 30,
  FLUSH_S: 5,
  SIMCLOCK_S: 30,
  TRICKLE_S: 15,
  CLOCK_CLAMP_S: 60,
  LOCK_STALE_S: 60,
  AUTH_TIMEOUT_MS: 8000
});

export const PRESETS = Object.freeze({
  LOW: Object.freeze({ pixelRatio: 1.0, shadows: false, shadowSize: 0, fogFar: 450, particleScale: 0.3, bloom: false, vignette: false }),
  MEDIUM: Object.freeze({ pixelRatio: 1.5, shadows: true, shadowSize: 1024, fogFar: 750, particleScale: 0.7, bloom: false, vignette: true }),
  HIGH: Object.freeze({ pixelRatio: 2.0, shadows: true, shadowSize: 2048, fogFar: 1200, particleScale: 1.0, bloom: true, vignette: true })
});

export const KEYS = Object.freeze({
  FORWARD: "KeyW",
  LEFT: "KeyA",
  BACKWARD: "KeyS",
  RIGHT: "KeyD",
  BRAKE: "Space",
  FLIP: "KeyF",
  DRILL: "KeyE",
  TANKER: "KeyQ",
  BUILD: "KeyB",
  CAMERA: "KeyC",
  NEXT_ROVER: "Tab",
  ROVER_1: "Digit1",
  ROVER_2: "Digit2",
  ROVER_3: "Digit3",
  ROVER_4: "Digit4",
  ROVER_5: "Digit5",
  ROVER_6: "Digit6",
  ROVER_7: "Digit7",
  ROVER_8: "Digit8",
  ROVER_9: "Digit9",
  HELP: "KeyH",
  MUTE: "KeyM",
  CLOSE: "Escape"
});
