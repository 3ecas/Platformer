/** A minimal publish/subscribe hub, so systems can react to each other without direct references. */
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /** Subscribes to an event. Returns a function that unsubscribes. */
  on(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
    return () => this.listeners.get(type).delete(listener);
  }

  emit(type, payload) {
    this.listeners.get(type)?.forEach((listener) => listener(payload));
  }
}
