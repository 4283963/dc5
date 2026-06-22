const Game = require('./Game');
const { MESSAGE_TYPES } = require('../../shared/constants');

class Room {
  constructor(roomId) {
    this.id = roomId;
    this.game = new Game();
    this.clients = new Map();
    this.game.setBroadcastCallback((state) => this.broadcast(state));
    this.game.start();
  }

  addPlayer(client, playerId, name) {
    this.clients.set(playerId, client);
    this.game.addPlayer(playerId, name);

    client.send(JSON.stringify({
      type: MESSAGE_TYPES.INIT,
      playerId,
      worldWidth: this.game.getState().worldWidth,
      worldHeight: this.game.getState().worldHeight,
    }));

    this.broadcast({
      type: MESSAGE_TYPES.PLAYER_JOIN,
      playerId,
      name,
    });
  }

  removePlayer(playerId) {
    this.clients.delete(playerId);
    this.game.removePlayer(playerId);

    this.broadcast({
      type: MESSAGE_TYPES.PLAYER_LEAVE,
      playerId,
    });
  }

  handleInput(playerId, input) {
    this.game.handleInput(playerId, input);
  }

  handleShoot(playerId, targetX, targetY) {
    this.game.handleShoot(playerId, targetX, targetY);
  }

  broadcast(message) {
    const data = JSON.stringify(message);
    for (const client of this.clients.values()) {
      if (client.readyState === 1) {
        client.send(data);
      }
    }
  }

  get playerCount() {
    return this.clients.size;
  }

  destroy() {
    this.game.stop();
  }
}

module.exports = Room;
