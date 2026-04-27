const DEFAULT_MIN_FRAMES = 4;
const DEFAULT_REQUIRED_MOVING_PAIRS = 2;
const DEFAULT_MIN_MOTION_SCORE = 5.5;
const DEFAULT_MIN_FRAME_BYTES = 1200;
const DEFAULT_SIGNATURE_POINTS = 768;

function toNumeric(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value !== 'string') {
        return fallback;
    }

    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
        return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
        return false;
    }
    return fallback;
}

function stripDataUrl(value) {
    const raw = String(value || '').trim();
    const commaIndex = raw.indexOf(',');
    if (raw.startsWith('data:') && commaIndex >= 0) {
        return raw.slice(commaIndex + 1);
    }
    return raw;
}

function frameToBuffer(value) {
    const raw = stripDataUrl(value);
    if (!raw) {
        return null;
    }

    try {
        const buffer = Buffer.from(raw, 'base64');
        return buffer.length > 0 ? buffer : null;
    } catch {
        return null;
    }
}

function readLivenessFrames(body) {
    const frameSets = [
        body?.liveness_frames,
        body?.livenessFrames,
        body?.image_frames,
        body?.imageFrames,
    ];

    const frames = frameSets.find((value) => Array.isArray(value));
    return Array.isArray(frames) ? frames : [];
}

function sampleByteSignature(buffer, points) {
    if (!buffer || buffer.length === 0) {
        return [];
    }

    const signature = [];
    const safePoints = Math.max(1, points);
    const step = Math.max(1, Math.floor(buffer.length / safePoints));
    for (let index = 0; index < buffer.length && signature.length < safePoints; index += step) {
        signature.push(buffer[index]);
    }

    return signature;
}

function getMotionScore(previous, next) {
    const count = Math.min(previous.length, next.length);
    if (count === 0) {
        return 0;
    }

    let total = 0;
    for (let index = 0; index < count; index += 1) {
        total += Math.abs((previous[index] || 0) - (next[index] || 0));
    }

    return total / count;
}

function verifyLivenessPayload(body) {
    const requireLiveness = toBoolean(process.env.ATTENDANCE_REQUIRE_LIVENESS, true);
    if (!requireLiveness) {
        return {
            ok: true,
            skipped: true,
            reason: 'Liveness verification is disabled by ATTENDANCE_REQUIRE_LIVENESS=false.',
        };
    }

    const minFrames = Math.max(2, Math.floor(toNumeric(process.env.ATTENDANCE_LIVENESS_MIN_FRAMES, DEFAULT_MIN_FRAMES)));
    const requiredMovingPairs = Math.max(1, Math.floor(toNumeric(process.env.ATTENDANCE_LIVENESS_REQUIRED_MOVING_PAIRS, DEFAULT_REQUIRED_MOVING_PAIRS)));
    const minMotionScore = toNumeric(process.env.ATTENDANCE_LIVENESS_MIN_MOTION_SCORE, DEFAULT_MIN_MOTION_SCORE);
    const minFrameBytes = Math.max(1, Math.floor(toNumeric(process.env.ATTENDANCE_LIVENESS_MIN_FRAME_BYTES, DEFAULT_MIN_FRAME_BYTES)));
    const signaturePoints = Math.max(16, Math.floor(toNumeric(process.env.ATTENDANCE_LIVENESS_SIGNATURE_POINTS, DEFAULT_SIGNATURE_POINTS)));

    const rawFrames = readLivenessFrames(body);
    if (rawFrames.length < minFrames) {
        return {
            ok: false,
            message: `Liveness verification requires at least ${minFrames} camera frames. Please retry and move slightly.`,
            error_code: 'LIVENESS_FRAMES_REQUIRED',
            score: 0,
        };
    }

    const buffers = rawFrames
        .map(frameToBuffer)
        .filter((buffer) => buffer && buffer.length >= minFrameBytes);

    if (buffers.length < minFrames) {
        return {
            ok: false,
            message: 'Liveness verification failed because the camera frames are invalid or too small.',
            error_code: 'LIVENESS_INVALID_FRAMES',
            score: 0,
        };
    }

    const signatures = buffers.map((buffer) => sampleByteSignature(buffer, signaturePoints));
    const scores = [];
    for (let index = 1; index < signatures.length; index += 1) {
        scores.push(getMotionScore(signatures[index - 1], signatures[index]));
    }

    const movingPairs = scores.filter((score) => score >= minMotionScore).length;
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const averageScore = scores.length > 0
        ? scores.reduce((total, score) => total + score, 0) / scores.length
        : 0;

    if (movingPairs < requiredMovingPairs) {
        return {
            ok: false,
            message: 'Liveness verification failed. Please use a real face and move slightly, not a static photo.',
            error_code: 'LIVENESS_MOTION_TOO_LOW',
            score: averageScore,
            best_score: bestScore,
            moving_pairs: movingPairs,
            required_moving_pairs: requiredMovingPairs,
        };
    }

    return {
        ok: true,
        score: averageScore,
        best_score: bestScore,
        moving_pairs: movingPairs,
        required_moving_pairs: requiredMovingPairs,
    };
}

module.exports = {
    verifyLivenessPayload,
};
