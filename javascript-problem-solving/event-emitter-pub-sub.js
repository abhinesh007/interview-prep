/**
 * =============================================================================
 * PROBLEM: Event Emitter (Observer / Pub-Sub Pattern)
 * =============================================================================
 * 
 * Problem Description:
 * Implement an `EventEmitter` class in JavaScript that allows registering, 
 * triggering, and unregistering event listeners.
 * 
 * Implement the following methods:
 * 1. `on(eventName, listener)`: Adds `listener` callback to the end of the 
 *    listeners array for the specified `eventName`. Returns an object with an 
 *    `unsubscribe()` method (or returns `this`).
 * 2. `emit(eventName, ...args)`: Synchronously calls each of the listeners 
 *    registered for `eventName`, in the order they were registered, passing the 
 *    supplied arguments to each. Returns `true` if event had listeners, `false` otherwise.
 * 3. `off(eventName, listener)`: Removes the specified `listener` from the 
 *    listener array for `eventName`.
 * 4. `once(eventName, listener)`: Adds a one-time `listener` function for `eventName`. 
 *    The next time `eventName` is triggered, this listener is removed and then invoked.
 * 
 * Examples:
 * 
 * Example:
 *   const emitter = new EventEmitter();
 *   const cb = (data) => console.log('Data:', data);
 *   emitter.on('msg', cb);
 *   emitter.emit('msg', 'hello'); // Logs: Data: hello
 *   emitter.off('msg', cb);
 *   emitter.emit('msg', 'world'); // Nothing logged
 * =============================================================================
 */

export class EventEmitter {
    constructor() {
        // TODO: Implement constructor
        throw new Error('Not implemented');
    }

    on(eventName, listener) {
        // TODO: Implement on
        throw new Error('Not implemented');
    }

    emit(eventName, ...args) {
        // TODO: Implement emit
        throw new Error('Not implemented');
    }

    off(eventName, listener) {
        // TODO: Implement off
        throw new Error('Not implemented');
    }

    once(eventName, listener) {
        // TODO: Implement once
        throw new Error('Not implemented');
    }
}

// --- Test Cases ---
// const emitter = new EventEmitter();
// const logA = (val) => console.log('A received:', val);
// emitter.on('event', logA);
// emitter.emit('event', 42); // Expected: A received: 42
// emitter.off('event', logA);
// emitter.emit('event', 100); // Expected: nothing
