import { StickFigurePose } from './types';
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
 * Updates the main stick figure pose in the state based on the current animation progress.
 * This is used for both playing the animation and scrubbing the timeline.
 */
export function updatePoseForAnimationProgress(state: AppState) {
    const progress = state.animationProgress;
    if (state.keyframes.length < 2) {
        return;
    }
    let sourceFrameIndex = -1;
    // Find the current segment
    for (let i = 0; i < state.keyframes.length - 1; i++) {
        if (progress >= state.keyframes[i].time && progress <= state.keyframes[i+1].time) {
            sourceFrameIndex = i;
            break;
        }
    }

    if (sourceFrameIndex === -1) {
        // Before the first keyframe or after the last one
        if (progress >= 1.0) {
           state.stickFigurePose = JSON.parse(JSON.stringify(state.keyframes[state.keyframes.length - 1].pose));
        } else {
           state.stickFigurePose = JSON.parse(JSON.stringify(state.keyframes[0].pose));
        }
    } else {
        const targetFrameIndex = sourceFrameIndex + 1;
        const sourceFrame = state.keyframes[sourceFrameIndex];
        const targetFrame = state.keyframes[targetFrameIndex];

        const segmentDuration = targetFrame.time - sourceFrame.time;
        const timeIntoSegment = progress - sourceFrame.time;
        
        const segmentProgress = (segmentDuration === 0) ? 1 : Math.min(1, timeIntoSegment / segmentDuration);

        state.stickFigurePose = interpolatePose(sourceFrame.pose, targetFrame.pose, segmentProgress);
    }
}