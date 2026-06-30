// Allen & Heath Avantis Solo — MIDI over TCP (port 51325)
// Byte patterns are verified against the working Lua reference.
const net = require('net');
const { avantis: config } = require('../config/devices');

const RECONNECT_DELAY_MS = 5000;

let socket = null;
let reconnectTimer = null;
let dataCallback = null;

// ── Connection ────────────────────────────────────────────────────────────────

function connect() {
    if (socket) socket.destroy();

    socket = new net.Socket();

    socket.connect(config.port, config.ip, () => {
        console.log(`[Avantis] Connected to ${config.ip}:${config.port}`);
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
    });

    socket.on('data', (data) => {
        console.log(`[Avantis] RX: ${data.toString('hex')}`);
        if (dataCallback) dataCallback(data);
    });

    socket.on('close', () => {
        console.warn(`[Avantis] Connection closed — retrying in ${RECONNECT_DELAY_MS / 1000}s`);
        scheduleReconnect();
    });

    socket.on('error', (err) => {
        // 'close' fires after 'error', so reconnect is handled there
        console.error(`[Avantis] Socket error: ${err.message}`);
    });
}

function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
    }, RECONNECT_DELAY_MS);
}

function send(bytes) {
    if (!socket || socket.destroyed || !socket.writable) {
        console.warn('[Avantis] Cannot send — socket not connected');
        return;
    }
    const buf = Buffer.from(bytes);
    console.log(`[Avantis] TX: ${buf.toString('hex')}`);
    socket.write(buf);
}

// ── MIDI helpers ──────────────────────────────────────────────────────────────

function noteOn(note, velocity) {
    // Lua ref: midi.send(0x90 + CH, note, velocity)
    return [0x90 + config.baseMidiChannel, note, velocity];
}

function cc(controller, value) {
    // Lua ref: midi.send(0xB0 + CH, controller, value)
    return [0xB0 + config.baseMidiChannel, controller, value];
}

// ── Exported commands ─────────────────────────────────────────────────────────

// Lua ref pattern:
//   mute on:  note_on(input-1, 0x7F) → note_on(input-1, 0x00)
//   mute off: note_on(input-1, 0x3F) → note_on(input-1, 0x00)
// The second message (velocity 0x00) simulates button-release.
function setMute(inputIndex, isOn) {
    const note = inputIndex - 1;
    const pressVelocity = isOn ? 0x7F : 0x3F;
    send([
        ...noteOn(note, pressVelocity),  // press
        ...noteOn(note, 0x00),           // release
    ]);
}

// Lua ref pattern:
//   NRPN MSB (CC 99 / 0x63) = inputIndex-1  (selects channel)
//   NRPN LSB (CC 98 / 0x62) = 0x17          (fader parameter)
//   Data Entry MSB (CC 6 / 0x06) = midiValue
// dB range: -90 to +10, mapped linearly to 0–127
function setFader(inputIndex, dbValue) {
    const clamped = Math.max(-90, Math.min(10, dbValue));
    const midiValue = Math.round((clamped + 90) / 100 * 127);
    send([
        ...cc(0x63, inputIndex - 1),  // NRPN MSB — channel select
        ...cc(0x62, 0x17),            // NRPN LSB — fader parameter
        ...cc(0x06, midiValue),       // Data Entry MSB — level
    ]);
}

// Lua ref pattern: Bank Select MSB + LSB, then Program Change on base channel.
// Scenes >128 increment the bank LSB; MSB stays 0 on Avantis.
// sceneNumber is 1-indexed (matches the Avantis UI).
function recallScene(sceneNumber) {
    const program = (sceneNumber - 1) % 128;
    const bank    = Math.floor((sceneNumber - 1) / 128);
    send([
        ...cc(0x00, 0x00),              // Bank Select MSB = 0
        ...cc(0x20, bank),              // Bank Select LSB
        0xC0 + config.baseMidiChannel, program,  // Program Change
    ]);
}

// Stub — wire up a parser here once we have MIDI feedback from Avantis to decode.
function onData(callback) {
    dataCallback = callback;
}

module.exports = { connect, setMute, setFader, recallScene, onData };
