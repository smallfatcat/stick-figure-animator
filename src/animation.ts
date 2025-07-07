
import { StickFigurePose, Keyframe } from './types';
import { AppState } from './state';

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

/**
 * Pure function to get an interpolated pose at a specific animation progress.
 * @param progress Normalized animation progress (0.0 to 1.0).
 * @param keyframes The array of keyframes to interpolate between.
 * @returns An interpolated StickFigurePose or null if not possible.
 */
export function getPoseAtProgress(progress: number, keyframes: Keyframe[]): StickFigurePose | null {
    if (keyframes.length === 0) {
        return null;
    }
    if (keyframes.length === 1) {
        return JSON.parse(JSON.stringify(keyframes[0].pose));
    }

    let sourceFrameIndex = -1;
    // Find the current segment
    for (let i = 0; i < keyframes.length - 1; i++) {
        if (progress >= keyframes[i].time && progress <= keyframes[i+1].time) {
            sourceFrameIndex = i;
            break;
        }
    }

    if (sourceFrameIndex === -1) {
        // Before the first keyframe or after the last one
        if (progress >= 1.0) {
           return JSON.parse(JSON.stringify(keyframes[keyframes.length - 1].pose));
        } else {
           return JSON.parse(JSON.stringify(keyframes[0].pose));
        }
    } else {
        const targetFrameIndex = sourceFrameIndex + 1;
        const sourceFrame = keyframes[sourceFrameIndex];
        const targetFrame = keyframes[targetFrameIndex];

        const segmentDuration = targetFrame.time - sourceFrame.time;
        const timeIntoSegment = progress - sourceFrame.time;
        
        const segmentProgress = (segmentDuration === 0) ? 1 : Math.min(1, timeIntoSegment / segmentDuration);

        return interpolatePose(sourceFrame.pose, targetFrame.pose, segmentProgress);
    }
}


/**
 * Updates the main stick figure pose in the state based on the current animation progress.
 * This is used for both playing the animation and scrubbing the timeline.
 */
export function updatePoseForAnimationProgress(state: AppState) {
    if (state.keyframes.length === 0) return;

    const newPose = getPoseAtProgress(state.animationProgress, state.keyframes);
    if (newPose) {
        state.stickFigurePose = newPose;
    }
}