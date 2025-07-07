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

    if (state.activeKeyframeIndex === indexToDelete) {
        state.activeKeyframeIndex = null;
        state.stickFigurePose = JSON.parse(JSON.stringify(defaultPose));
        state.animationProgress = 0;
        state.isOnionModeEnabled = false;
    }

    state.keyframes.splice(indexToDelete, 1);

    if (state.activeKeyframeIndex !== null && state.activeKeyframeIndex > indexToDelete) {
        state.activeKeyframeIndex--;
    }

    redistributeKeyframeTimes(state.keyframes);
    
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
