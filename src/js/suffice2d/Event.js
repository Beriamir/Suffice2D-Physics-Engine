export class Event {
  constructor() {
    this.events = {};
  }

  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    this.events[eventName].push(callback);
  }

  off(eventName, callback) {
    if (!this.events[eventName]) {
      return;
    }

    const listener = this.events[eventName].slice();

    for (let i = 0; i < listener.length; i++) {
      if (listener[i] === callback) {
        listener.splice(i, 1);
        break;
      }
    }
  }

  emit(eventName, data) {
    if (!this.events[eventName]) {
      return;
    }

    for (const callback of this.events[eventName]) {
      callback(data);
    }
  }
}
