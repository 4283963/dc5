(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CONSTANTS = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    TICK_RATE: 60,
    TICK_INTERVAL: 1000 / 60,

    WORLD_WIDTH: 1600,
    WORLD_HEIGHT: 900,

    PLAYER: {
      SIZE: 24,
      SPEED: 240,
      MAX_HP: 100,
      COLOR: 0x4ade80,
    },

    BULLET: {
      SIZE: 6,
      SPEED: 600,
      DAMAGE: 10,
      COLOR: 0xfacc15,
      LIFETIME: 2000,
    },

    MONSTER: {
      SIZE: 28,
      SPEED: 80,
      MAX_HP: 30,
      COLOR: 0xef4444,
      SPAWN_INTERVAL: 2000,
      MAX_COUNT: 20,
    },

    STATUS_EFFECTS: {
      FROZEN: 'frozen',
      BURNING: 'burning',
    },

    STATUS_CONFIG: {
      frozen: {
        duration: 3000,
        speedMultiplier: 0.5,
        color: 0x60a5fa,
      },
      burning: {
        duration: 5000,
        damagePerSecond: 10,
        tickInterval: 500,
        color: 0xf97316,
        particleCount: 3,
        particleSpeed: 80,
      },
    },

    BULLET_STATUS_CHANCE: 0.25,

    MESSAGE_TYPES: {
      PLAYER_JOIN: 'player_join',
      PLAYER_LEAVE: 'player_leave',
      INPUT: 'input',
      SHOOT: 'shoot',
      GAME_STATE: 'game_state',
      INIT: 'init',
    },
  };
});
