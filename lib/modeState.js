// Shared in-memory state singleton — ported from Q-SYS UCI variable pattern.
// Node.js module caching ensures all function nodes that require() this file
// share the exact same object reference, matching how Q-SYS UCI variables
// persisted state across script boundaries.
//
// This is session state only — it does not survive a Node-RED restart.
// For persistence across restarts, write critical values to Node-RED's
// file-backed context store and re-hydrate here on startup.

module.exports = {
    currentMode: null,          // 'classroom' | 'assembly' | 'production' | null

    inputSelection: {
        left: null,             // 1, 2, or 3 (matches Blustream input number)
        right: null,
        rear: null,
    },

    projectorPower: {
        left: false,
        right: false,
        rear: false,
    },

    rearCurrentInput: null,     // cached result of last getCurrentInput() poll
};
