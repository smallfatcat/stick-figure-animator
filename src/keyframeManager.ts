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
        
    const newKeyframe: Keyframe = { pose: JSON.parse(JSON.stringify(state.stickFigurePose)), time: 0 };
    
    const insertIndex = state.activeKeyframeIndex === null ? state.keyframes.length : state.activeKeyframeIndex + 1;

    let newKeyframeTime: number;

    if (state.keyframes.length === 0) {
        // First keyframe is always at time 0.
        newKeyframeTime = 0;
    } else {
        const nextKeyframe = insertIndex < state.keyframes.length ? state.keyframes[insertIndex] : null;

        if (nextKeyframe) {
            // Inserting between two frames. The previous frame is at insertIndex - 1.
            const prevKeyframe = state.keyframes[insertIndex - 1];
            newKeyframeTime = prevKeyframe.time + (nextKeyframe.time - prevKeyframe.time) / 2;
        } else {
            // Appending to the end. insertIndex will be state.keyframes.length.
            const lastKeyframe = state.keyframes[state.keyframes.length - 1];
            
            const oldDuration = state.animationTotalDuration;
            const lastKeyframeAbsoluteTime = lastKeyframe.time * oldDuration;
            const newKeyframeAbsoluteTime = lastKeyframeAbsoluteTime + 1000; // Add 1 second.
            const newDuration = newKeyframeAbsoluteTime;

            // Set new duration.
            state.animationTotalDuration = newDuration;

            // Re-normalize all previous keyframes. Guard against division by zero.
            if (newDuration > 0) {
                for (const kf of state.keyframes) {
                    kf.time = (kf.time * oldDuration) / newDuration;
                }
            }
            
            newKeyframeTime = 1.0;
        }
    }
    
    newKeyframe.time = newKeyframeTime;
    
    state.keyframes.splice(insertIndex, 0, newKeyframe);
    
    state.activeKeyframeIndex = insertIndex;
    
    state.animationProgress = newKeyframeTime;

    // Make sure the new keyframe is visible.
    const activeIndex = state.activeKeyframeIndex;
    if (activeIndex !== null) {
        if (activeIndex < state.scrollOffset) {
            state.scrollOffset = activeIndex;
        } else if (activeIndex >= state.scrollOffset + layout.VISIBLE_THUMBNAILS) {
            state.scrollOffset = activeIndex - layout.VISIBLE_THUMBNAILS + 1;
        }
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