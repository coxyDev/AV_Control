// Blustream ACM210 control via Telnet (TCP port 23)
// Command format: plain ASCII, CRLF terminated.
// Responses vary by command — we settle 200 ms after the last received chunk,
// or after the overall timeout, whichever comes first.
const net = require('net');

// ── Helpers ───────────────────────────────────────────────────────────────────

// Zero-pad a numeric ID to 3 digits: 1 → "001", "2" → "002"
function padId(id) {
    return String(parseInt(id, 10)).padStart(3, '0');
}

// ── Core transport ────────────────────────────────────────────────────────────

// Opens a short-lived Telnet connection, sends one command, and resolves with
// the response string (or null on timeout). Rejects on socket error.
function sendCommand(acmIp, acmPort, commandString, timeout = 3000) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        let buffer = '';
        let settled = false;
        let settleTimer = null;

        const finish = (result) => {
            if (settled) return;
            settled = true;
            clearTimeout(overallTimer);
            clearTimeout(settleTimer);
            socket.destroy();
            resolve(result);
        };

        const overallTimer = setTimeout(() => {
            console.warn(`[Blustream] Overall timeout (${timeout}ms) on "${commandString}"`);
            finish(buffer || null);
        }, timeout);

        socket.connect(acmPort, acmIp, () => {
            const line = commandString + '\r\n';
            console.log(`[Blustream] TX: ${JSON.stringify(line)}`);
            socket.write(line);
        });

        socket.on('data', (data) => {
            const chunk = data.toString();
            buffer += chunk;
            console.log(`[Blustream] RX: ${JSON.stringify(chunk)}`);

            // Resolve 200 ms after the last incoming chunk (response complete)
            clearTimeout(settleTimer);
            settleTimer = setTimeout(() => finish(buffer), 200);
        });

        socket.on('error', (err) => {
            console.error(`[Blustream] Error on "${commandString}": ${err.message}`);
            clearTimeout(overallTimer);
            clearTimeout(settleTimer);
            if (!settled) {
                settled = true;
                reject(err);
            }
        });

        socket.on('close', () => {
            // If we close before settling, resolve with whatever we got
            finish(buffer || null);
        });
    });
}

// ── ACM210 command wrappers ───────────────────────────────────────────────────
// All command strings match the ACM210 API documentation exactly.

// Route a single output to a specific input source
// ACM210 API: "OUT xxx FR yyy"
function switchOutputToInput(acmIp, acmPort, outputId, inputId) {
    const cmd = `OUT ${padId(outputId)} FR ${padId(inputId)}`;
    return sendCommand(acmIp, acmPort, cmd);
}

// Power an output on or off
// ACM210 API: "OUT xxx ON" / "OUT xxx OFF"
function setOutputPower(acmIp, acmPort, outputId, on) {
    const cmd = `OUT ${padId(outputId)} ${on ? 'ON' : 'OFF'}`;
    return sendCommand(acmIp, acmPort, cmd);
}

// Mute or unmute an output's HDMI signal
// ACM210 API: "OUT xxx MUTE ON" / "OUT xxx MUTE OFF"
function setOutputMute(acmIp, acmPort, outputId, on) {
    const cmd = `OUT ${padId(outputId)} MUTE ${on ? 'ON' : 'OFF'}`;
    return sendCommand(acmIp, acmPort, cmd);
}

// Reboot a decoder (RX) unit
// ACM210 API: "OUT xxx RB"
function rebootOutput(acmIp, acmPort, outputId) {
    return sendCommand(acmIp, acmPort, `OUT ${padId(outputId)} RB`);
}

// Reboot an encoder (TX) unit
// ACM210 API: "IN xxx RB"
function rebootInput(acmIp, acmPort, inputId) {
    return sendCommand(acmIp, acmPort, `IN ${padId(inputId)} RB`);
}

// Query the current status of an output (routing, power, signal lock, etc.)
// ACM210 API: "OUT xxx STATUS"
function getOutputStatus(acmIp, acmPort, outputId) {
    return sendCommand(acmIp, acmPort, `OUT ${padId(outputId)} STATUS`);
}

module.exports = {
    sendCommand,
    switchOutputToInput,
    setOutputPower,
    setOutputMute,
    rebootOutput,
    rebootInput,
    getOutputStatus,
    padId,
};
