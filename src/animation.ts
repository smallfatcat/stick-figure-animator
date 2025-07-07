import { StickFigurePose } from './types';

/**
 * Linearly interpolates between two numbers.
 */
function lerp(start: number, end: number, t: number): number {
    return start * (1 - t) + end * t;
}

/**
 * Interpolates between two angles, finding the shortest path.
 */
function lerpAngle(start: number, end: number, t: number): number {
    const delta = end - start;
    if (Math.abs(delta) > Math.PI) {
        if (delta > 0) {
            start += 2 * Math.PI;
        } else {
            end += 2 * Math.PI;
        }
    }
    return lerp(start, end, t);
}

/**
 * Interpolates between two StickFigurePose objects.
 */
export function interpolatePose(
    startPose: StickFigurePose,
    endPose: StickFigurePose,
    t: number
): StickFigurePose {
    const interpolatedAngles: { [key: string]: number } = {};
    for (const key in startPose.angles) {
        if (endPose.angles[key] !== undefined) {
            interpolatedAngles[key] = lerpAngle(startPose.angles[key], endPose.angles[key], t);
        } else {
            interpolatedAngles[key] = startPose.angles[key];
        }
    }
    const interpolatedHip = {
        x: lerp(startPose.hip.x, endPose.hip.x, t),
        y: lerp(startPose.hip.y, endPose.hip.y, t),
    };
    return { hip: interpolatedHip, angles: interpolatedAngles };
}
