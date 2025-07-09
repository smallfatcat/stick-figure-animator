/**
 * Normalizes a time value to be between 0 and 1
 */
export function normalizeTime(time: number): number {
    return Math.max(0, Math.min(1, time));
}

/**
 * Formats time for display based on the current mode
 */
export function formatTime(time: number, mode: 'seconds' | 'frames', totalDuration: number): string {
    if (mode === 'seconds') {
        const timeInSeconds = (time * totalDuration / 1000).toFixed(1);
        return `${timeInSeconds}s`;
    } else { // frames
        const frameNumber = Math.round(time * (totalDuration / 1000) * 60);
        return `${frameNumber}f`;
    }
}

/**
 * Converts seconds to milliseconds
 */
export function secondsToMs(seconds: number): number {
    return seconds * 1000;
}

/**
 * Converts milliseconds to seconds
 */
export function msToSeconds(ms: number): number {
    return ms / 1000;
}

/**
 * Converts frames to milliseconds (assuming 60fps)
 */
export function framesToMs(frames: number): number {
    return (frames / 60) * 1000;
}

/**
 * Converts milliseconds to frames (assuming 60fps)
 */
export function msToFrames(ms: number): number {
    return Math.round((ms / 1000) * 60);
}

/**
 * Validates time input based on display mode
 */
export function validateTimeInput(value: string, mode: 'seconds' | 'frames'): { isValid: boolean; value?: number; error?: string } {
    if (mode === 'seconds') {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue <= 0) {
            return { isValid: false, error: "Invalid duration. Please enter a positive number." };
        }
        return { isValid: true, value: numValue };
    } else { // frames
        const frameValue = parseInt(value, 10);
        if (isNaN(frameValue) || frameValue <= 0) {
            return { isValid: false, error: "Invalid duration. Please enter a positive integer for frames." };
        }
        return { isValid: true, value: frameValue };
    }
} 