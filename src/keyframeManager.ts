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
    state.keyframes.splice(insertIndex, 0, newKeyframe);
    
    state.activeKeyframeIndex = insertIndex;
    
    redistributeKeyframeTimes(state.keyframes);
    
    state.animationProgress = state.keyframes[insertIndex].time;

    state.scrollOffset = Math.max(0, state.keyframes.length - layout.VISIBLE_THUMBNAILS);
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