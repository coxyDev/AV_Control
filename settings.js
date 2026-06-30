const path = require('path');
const devices = require('./config/devices');
const avantis  = require('./lib/avantis');
const projector = require('./lib/projector');
const blustream = require('./lib/blustream');
const modeState = require('./lib/modeState');

// Establish persistent MIDI socket to Avantis Solo on Node-RED launch.
// The module will auto-reconnect on drop; no further action needed here.
avantis.connect();

module.exports = {
    // HTTP server
    uiPort: process.env.PORT || 1880,
    uiHost: '0.0.0.0',

    // Flow file stored relative to userDir
    userDir: path.join(__dirname, '.node-red'),
    flowFile: path.join(__dirname, 'flows', 'av-control.json'),
    flowFilePretty: true,

    // Auto-reload flows when flowFile changes on disk
    flowFileBackup: true,
    runtimeState: {
        enabled: true,
        ui: true,
    },

    // Editor
    disableEditor: false,
    editorTheme: {
        page: {
            title: 'AV Control',
        },
        header: {
            title: 'AV Control System',
        },
    },

    // Logging
    logging: {
        console: {
            level: 'info',
            metrics: false,
            audit: false,
        },
    },

    // Context storage — file-backed so values survive restarts
    contextStorage: {
        default: {
            module: 'memory',
        },
        file: {
            module: 'localfilesystem',
            config: {
                dir: path.join(__dirname, '.node-red', 'context'),
                flushInterval: 30,
            },
        },
    },

    // Expose device config and lib modules to function nodes via global context.
    // Access in function nodes: global.get('devices'), global.get('projector'), etc.
    functionGlobalContext: {
        devices,
        avantis,
        projector,
        blustream,
        modeState,
    },

    // Security — set credentials before deploying to a real network
    // adminAuth: require('./config/auth'),

    // Allow file-based env vars for per-device overrides
    // editorTheme: { ...see docs... }
};
