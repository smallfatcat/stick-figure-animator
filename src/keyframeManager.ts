import { Keyframe, StickFigurePose } from './types';
import { AppState } from './state';

export function redistributeKeyframeTimes(keyframes: Keyframe[]) {
    const numKeyframes = keyframes.length;
    if (numKeyframes < 1) return;

    if (numKeyframes === 1) {
        keyframes[0].time = 0;
        return;
    }
    
    keyframes.forEach((kf, index) => {
        kf.time = index / (numKeyframes - 1);
    });
}

export function autoSaveCurrentPoseIfActive(state: AppState) {
    if (state.activeKeyframeIndex !== null && state.keyframes[state.activeKeyframeIndex]) {
        state.keyframes[state.activeKeyframeIndex].pose = JSON.parse(JSON.stringify(state.stickFigurePose));
    }
}

export function addKeyframe(state: AppState, layout: any) {
    autoSaveCurrentPoseIfActive(state);
    
    let keyframeTime: number;

    // Step 1: Determine the base time for the keyframe
    if (state.keyframes.length === 0) {
        keyframeTime = 0;
    } else if (state.keyframes.length === 1) {
        keyframeTime = 1.0;
    } else {
        keyframeTime = state.animationProgress;
    }

    // Ensure keyframes are sorted before finding indices
    state.keyframes.sort((a, b) => a.time - b.time);

    // Step 2: Check if a keyframe already exists at this exact time
    const existingKeyframeIndex = state.keyframes.findIndex(kf => kf.time === keyframeTime);

    if (existingKeyframeIndex !== -1) {
        // A keyframe exists. We need to insert the new one between it and the next one.
        const nextKeyframe = state.keyframes[existingKeyframeIndex + 1];
        if (nextKeyframe) {
            // Insert halfway to the next frame.
            keyframeTime = keyframeTime + (nextKeyframe.time - keyframeTime) / 2;
        } else {
            // This is the last keyframe, so we are adding at the end.
            // The logic below will handle extending the animation.
            keyframeTime = 1.0;
        }
    }

    const newKeyframe: Keyframe = { 
        pose: JSON.parse(JSON.stringify(state.stickFigurePose)), 
        time: keyframeTime
    };

    // Step 3: Handle extending the animation if adding at the end
    if (state.keyframes.length >= 1 && keyframeTime >= 1.0) {
        const oldDuration = state.animationTotalDuration;
        const newDuration = oldDuration + 1000; // Add 1 second
        state.animationTotalDuration = newDuration;

        // Renormalize existing keyframes to fit the new duration
        if (newDuration > 0) {
            for (const kf of state.keyframes) {
                kf.time = (kf.time * oldDuration) / newDuration;
            }
        }
        // The new keyframe is now the new end of the animation.
        newKeyframe.time = 1.0;
    }

    // Step 4: Add the new keyframe and update state
    state.keyframes.push(newKeyframe);
    state.keyframes.sort((a, b) => a.time - b.time);
    
    const newIndex = state.keyframes.indexOf(newKeyframe);
    state.activeKeyframeIndex = newIndex;
    
    // Update the playhead to match the new keyframe's time
    state.animationProgress = newKeyframe.time;

    // Make sure the new keyframe is visible in the timeline.
    if (newIndex < state.scrollOffset) {
        state.scrollOffset = newIndex;
    } else if (newIndex >= state.scrollOffset + layout.VISIBLE_THUMBNAILS) {
        state.scrollOffset = newIndex - layout.VISIBLE_THUMBNAILS + 1;
    }
}

export function deleteKeyframe(state: AppState, indexToDelete: number, defaultPose: StickFigurePose, layout: any) {
    autoSaveCurrentPoseIfActive(state);

    const wasLastChronologicalKeyframe = indexToDelete === state.keyframes.length - 1;
    const oldDuration = state.animationTotalDuration;

    if (state.activeKeyframeIndex === indexToDelete) {
        state.activeKeyframeIndex = null;
        state.stickFigurePose = JSON.parse(JSON.stringify(defaultPose));
        state.animationProgress = 0;
        state.isOnionModeEnabled = false;
    }

    // 1. Remove the keyframe from the array
    state.keyframes.splice(indexToDelete, 1);

    // 2. Adjust active keyframe index if it was positioned after the deleted one
    if (state.activeKeyframeIndex !== null && state.activeKeyframeIndex > indexToDelete) {
        state.activeKeyframeIndex--;
    }

    // 3. Adjust timing and duration
    if (state.keyframes.length === 0) {
        // No keyframes left, reset duration to default
        state.animationTotalDuration = 5000;
    } else if (state.keyframes.length === 1) {
        // Only one keyframe left, its time must be 0
        state.keyframes[0].time = 0;
    } else if (wasLastChronologicalKeyframe) {
        // We deleted the last keyframe, so the animation's end-point has changed.
        // We must adjust the duration and re-normalize the times of remaining keyframes.
        const newLastKeyframe = state.keyframes[state.keyframes.length - 1];
        const newDuration = newLastKeyframe.time * oldDuration;

        if (newDuration > 0 && oldDuration > 0) {
            state.animationTotalDuration = newDuration;
            // Re-normalize all remaining keyframes based on the new duration.
            for (const kf of state.keyframes) {
                kf.time = (kf.time * oldDuration) / newDuration;
            }
        } else {
            // This edge case happens if the new last frame was at time=0.
            // It implies all remaining frames are at time=0. Just ensure it.
            state.keyframes.forEach(kf => kf.time = 0);
        }
    }
    // If a middle keyframe was deleted, we do nothing to times, preserving their absolute positions.

    state.hoveredDeleteIconIndex = null;
    state.scrollOffset = Math.max(0, Math.min(state.scrollOffset, state.keyframes.length - layout.VISIBLE_THUMBNAILS));
}

export function insertKeyframeAtTime(state: AppState, pose: StickFigurePose, time: number): number {
    const newKeyframe: Keyframe = {
        pose: JSON.parse(JSON.stringify(pose)),
        time: time,
    };

    state.keyframes.push(newKeyframe);
    state.keyframes.sort((a, b) => a.time - b.time);

    return state.keyframes.indexOf(newKeyframe);
}

export function renormalizeKeyframeTimes(keyframes: Keyframe[]) {
    if (keyframes.length < 2) {
        if (keyframes.length === 1) keyframes[0].time = 0;
        return;
    }
    const firstTime = keyframes[0].time;
    const lastTime = keyframes[keyframes.length - 1].time;
    const duration = lastTime - firstTime;
    if (duration === 0) {
        // All times are the same, just space them evenly
        keyframes.forEach((kf, i) => {
            kf.time = i / (keyframes.length - 1);
        });
        return;
    }
    keyframes[0].time = 0;
    for (let i = 1; i < keyframes.length - 1; i++) {
        keyframes[i].time = (keyframes[i].time - firstTime) / duration;
    }
    keyframes[keyframes.length - 1].time = 1;
}