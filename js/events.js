/** Names of the events the world announces on the game's event bus. */
export const EVENTS = Object.freeze({
  PLAYER_LANDED: 'player-landed', // every touchdown, with the impact (0–1)
  PLATFORM_LANDED: 'platform-landed', // the first touchdown on each platform
  PLAYER_FELL: 'player-fell',
});
