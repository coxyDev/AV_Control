// Epson ESC/VP21 projector control over TCP (port 3629)
// Ported from: Projector Power Control.txt, Input Routing.txt (Q-SYS Lua)
// Protocol: send command + CR, wait for ':' (ready/OK) or 'ERR...'
// Spec timeouts:
//   PWR ON   — up to 40 s for lamp/laser ready
//   PWR OFF  — up to 130 s for cooling (model-dependent)
//   SOURCE   — up to 5 s per ESC/VP21 spec
//   All others — 3 s is sufficient
const net = require('net');

// TODO: CONFIRM — source codes vary by Epson model and firmware version.
// These are common values but MUST be verified against the physical command list
// for EB-770F and EB-PU7000 before going live. Source codes in the spec appendix
// are listed per-model and do not always match between projector families.
const SOURCE_CODES = {
    HDMI1: '30',   // TODO: CONFIRM for EB-770F / EB-PU7000
    HDMI2: 'A0',   // TODO: CONFIRM for EB-770F / EB-PU7000
};

// ── Core transports ───────────────────────────────────────────────────────────

// Two-phase TCP: wait for projector's initial ':' greeting, then send command + CR.
// Resolves true (got ':') or false (got 'ERR' or timeout).
function sendCommand(ip, port, commandString, timeout = 3000) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        let buffer = '';
        let commandSent = false;
        let settled = false;

        const finish = (success) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            socket.destroy();
            resolve(success);
        };

        const timer = setTimeout(() => {
            console.warn(`[Projector ${ip}] Timeout (${timeout}ms) waiting for response to "${commandString}"`);
            finish(false);
        }, timeout);

        socket.connect(port, ip, () => {
            console.log(`[Projector ${ip}] Connected — awaiting greeting prompt`);
        });

        socket.on('data', (data) => {
            buffer += data.toString();
            console.log(`[Projector ${ip}] RX: ${JSON.stringify(buffer)}`);

            if (!commandSent) {
                if (buffer.includes(':')) {
                    commandSent = true;
                    buffer = '';
                    const line = commandString + '\r';
                    console.log(`[Projector ${ip}] TX: ${JSON.stringify(line)}`);
                    socket.write(line);
                }
                return;
            }

            if (buffer.includes(':')) {
                finish(true);
            } else if (buffer.includes('ERR')) {
                console.warn(`[Projector ${ip}] ERR response to "${commandString}"`);
                finish(false);
            }
        });

        socket.on('error', (err) => {
            console.error(`[Projector ${ip}] Error: ${err.message}`);
            clearTimeout(timer);
            if (!settled) { settled = true; reject(err); }
        });

        socket.on('close', () => { finish(false); });
    });
}

// Like sendCommand but returns the response text content instead of a boolean.
// Used for query commands (SOURCE?, PWR?) that return data before the ':' prompt.
// Response format from projector: "SOURCE=30\r:" — extracts the part before ':'.
function _query(ip, port, commandString, timeout = 3000) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        let buffer = '';
        let commandSent = false;
        let settled = false;

        const finish = (result) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            socket.destroy();
            resolve(result);
        };

        const timer = setTimeout(() => {
            console.warn(`[Projector ${ip}] Query timeout (${timeout}ms) for "${commandString}"`);
            finish(null);
        }, timeout);

        socket.connect(port, ip, () => {
            console.log(`[Projector ${ip}] Connected for query`);
        });

        socket.on('data', (data) => {
            buffer += data.toString();
            console.log(`[Projector ${ip}] RX: ${JSON.stringify(buffer)}`);

            if (!commandSent) {
                if (buffer.includes(':')) {
                    commandSent = true;
                    buffer = '';
                    const line = commandString + '\r';
                    console.log(`[Projector ${ip}] TX: ${JSON.stringify(line)}`);
                    socket.write(line);
                }
                return;
            }

            if (buffer.includes(':')) {
                // Extract content before the trailing ':' ready prompt
                const colonIdx = buffer.lastIndexOf(':');
                const response = buffer.substring(0, colonIdx).trim();
                console.log(`[Projector ${ip}] Query response: ${JSON.stringify(response)}`);
                finish(response);
            } else if (buffer.includes('ERR')) {
                console.warn(`[Projector ${ip}] ERR response to query "${commandString}"`);
                finish(null);
            }
        });

        socket.on('error', (err) => {
            console.error(`[Projector ${ip}] Query error: ${err.message}`);
            clearTimeout(timer);
            if (!settled) { settled = true; reject(err); }
        });

        socket.on('close', () => { finish(null); });
    });
}

// ── ESC/VP21 convenience wrappers ─────────────────────────────────────────────

const { projectors } = require('../config/devices');
const PORT = projectors.port;

function powerOn(ip) {
    return sendCommand(ip, PORT, 'PWR ON', 40000);
}

function powerOff(ip) {
    return sendCommand(ip, PORT, 'PWR OFF', 130000);
}

function powerQuery(ip) {
    return sendCommand(ip, PORT, 'PWR?');
}

// ESC/VP21 spec: source switch takes up to 5 seconds — timeout set accordingly.
// Use SOURCE_CODES constants; confirm codes against hardware before live use.
function setInput(ip, sourceCode) {
    return sendCommand(ip, PORT, `:SOURCE ${sourceCode}`, 5000);
}

// Returns the raw source code string (e.g. "30" for HDMI1).
// Projector response format: "SOURCE=30" — strips the "SOURCE=" prefix.
async function getCurrentInput(ip) {
    const response = await _query(ip, PORT, ':SOURCE?');
    if (!response) return null;
    if (response.startsWith('SOURCE=')) {
        return response.replace('SOURCE=', '').trim();
    }
    return response;
}

// TODO: CONFIRM — ESC/VP21 audio/video mute command varies by model and firmware.
// Likely ":MUTE ON\r" / ":MUTE OFF\r" for EB-770F / EB-PU7000, but verify against
// the physical command reference before trusting in production.
function setAudioMute(ip, on) {
    return sendCommand(ip, PORT, `:MUTE ${on ? 'ON' : 'OFF'}`);
}

// Legacy wrapper kept for compatibility — prefer setInput (uses correct colon-prefix format)
function setSource(ip, sourceCode) {
    return sendCommand(ip, PORT, `SOURCE ${sourceCode}`);
}

module.exports = {
    SOURCE_CODES,
    sendCommand,
    powerOn,
    powerOff,
    powerQuery,
    setInput,
    getCurrentInput,
    setAudioMute,
    setSource,
};
