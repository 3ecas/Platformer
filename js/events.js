/** Names of the events the world announces on the game's event bus. */
export const EVENTS = Object.freeze({
  PLAYER_LAUNCHED: 'player-launched', // with the launch strength (0–1)
  PLAYER_LANDED: 'player-landed', // every touchdown, with the impact (0–1)
  PLATFORM_LANDED: 'platform-landed', // the first touchdown on each platform
  PLAYER_BOUNCED: 'player-bounced', // off a wall, with the strength (0–1)
  FLAME_WARNING: 'flame-warning', // a flamethrower on screen starts to sputter, with the warning's length in seconds
  FLAME_FIRED: 'flame-fired', // a flamethrower on screen fires, with how long it burns in seconds
  PLAYER_FELL: 'player-fell', // the run is over, with the cause: 'fall', 'spikes', 'thorn' or 'flame'
});
