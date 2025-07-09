import { Keyframe, StickFigurePose } from '../types';
import { deepCopyPose } from '../utils/poseUtils';

export class KeyframeService {
    constructor(private state: any) {} // Using any for now to maintain compatibility

    addKeyframe(layout: any) {
        this.autoSaveCurrentPoseIfActive();
        
        let keyframeTime: number;

        // Step 1: Determine the base time for the keyframe
        if (this.state.keyframes.length === 0) {
            keyframeTime = 0;
        } else if (this.state.keyframes.length === 1) {
            keyframeTime = 1.0;
        } else {
            keyframeTime = this.state.animationProgress;
        }

        // Ensure keyframes are sorted before finding indices
        this.state.keyframes.sort((a: Keyframe, b: Keyframe) => a.time - b.time);

        // Step 2: Check if a keyframe already exists at this exact time
        const existingKeyframeIndex = this.state.keyframes.findIndex((kf: Keyframe) => kf.time === keyframeTime);

        if (existingKeyframeIndex !== -1) {
            // A keyframe exists. We need to insert the new one between it and the next one.
            const nextKeyframe = this.state.keyframes[existingKeyframeIndex + 1];
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
            pose: deepCopyPose(this.state.stickFigurePose), 
            time: keyframeTime
        };

        // Step 3: Handle extending the animation if adding at the end
        if (this.state.keyframes.length >= 1 && keyframeTime >= 1.0) {
            const oldDuration = this.state.animationTotalDuration;
            const newDuration = oldDuration + 1000; // Add 1 second
            this.state.animationTotalDuration = newDuration;

            // Renormalize existing keyframes to fit the new duration
            if (newDuration > 0) {
                for (const kf of this.state.keyframes) {
                    kf.time = (kf.time * oldDuration) / newDuration;
                }
            }
            // The new keyframe is now the new end of the animation.
            newKeyframe.time = 1.0;
        }

        // Step 4: Add the new keyframe and update state
        this.state.keyframes.push(newKeyframe);
        this.state.keyframes.sort((a: Keyframe, b: Keyframe) => a.time - b.time);
        
        const newIndex = this.state.keyframes.indexOf(newKeyframe);
        this.state.activeKeyframeIndex = newIndex;
        
        // Update the playhead to match the new keyframe's time
        this.state.animationProgress = newKeyframe.time;

        // Make sure the new keyframe is visible in the timeline.
        if (newIndex < this.state.scrollOffset) {
            this.state.scrollOffset = newIndex;
        } else if (newIndex >= this.state.scrollOffset + layout.VISIBLE_THUMBNAILS) {
            this.state.scrollOffset = newIndex - layout.VISIBLE_THUMBNAILS + 1;
        }
    }

    deleteKeyframe(indexToDelete: number, defaultPose: StickFigurePose, layout: any) {
        this.autoSaveCurrentPoseIfActive();

        const wasLastChronologicalKeyframe = indexToDelete === this.state.keyframes.length - 1;
        const oldDuration = this.state.animationTotalDuration;

        if (this.state.activeKeyframeIndex === indexToDelete) {
            this.state.activeKeyframeIndex = null;
            this.state.stickFigurePose = deepCopyPose(defaultPose);
            this.state.animationProgress = 0;
            this.state.isOnionModeEnabled = false;
        }

        // 1. Remove the keyframe from the array
        this.state.keyframes.splice(indexToDelete, 1);

        // 2. Adjust active keyframe index if it was positioned after the deleted one
        if (this.state.activeKeyframeIndex !== null && this.state.activeKeyframeIndex > indexToDelete) {
            this.state.activeKeyframeIndex--;
        }

        // 3. Adjust timing and duration
        if (this.state.keyframes.length === 0) {
            // No keyframes left, reset duration to default
            this.state.animationTotalDuration = 5000;
        } else if (this.state.keyframes.length === 1) {
            // Only one keyframe left, its time must be 0
            this.state.keyframes[0].time = 0;
        } else if (wasLastChronologicalKeyframe) {
            // We deleted the last keyframe, so the animation's end-point has changed.
            // We must adjust the duration and re-normalize the times of remaining keyframes.
            const newLastKeyframe = this.state.keyframes[this.state.keyframes.length - 1];
            const newDuration = newLastKeyframe.time * oldDuration;

            if (newDuration > 0 && oldDuration > 0) {
                this.state.animationTotalDuration = newDuration;
                // Re-normalize all remaining keyframes based on the new duration.
                for (const kf of this.state.keyframes) {
                    kf.time = (kf.time * oldDuration) / newDuration;
                }
            } else {
                // This edge case happens if the new last frame was at time=0.
                // It implies all remaining frames are at time=0. Just ensure it.
                this.state.keyframes.forEach((kf: Keyframe) => kf.time = 0);
            }
        }
        // If a middle keyframe was deleted, we do nothing to times, preserving their absolute positions.

        this.state.hoveredDeleteIconIndex = null;
        this.state.scrollOffset = Math.max(0, Math.min(this.state.scrollOffset, this.state.keyframes.length - layout.VISIBLE_THUMBNAILS));
    }

    insertKeyframeAtTime(pose: StickFigurePose, time: number): number {
        const newKeyframe: Keyframe = {
            pose: deepCopyPose(pose),
            time: time,
        };

        this.state.keyframes.push(newKeyframe);
        this.state.keyframes.sort((a: Keyframe, b: Keyframe) => a.time - b.time);

        return this.state.keyframes.indexOf(newKeyframe);
    }

    autoSaveCurrentPoseIfActive() {
        if (this.state.activeKeyframeIndex !== null && this.state.keyframes[this.state.activeKeyframeIndex]) {
            this.state.keyframes[this.state.activeKeyframeIndex].pose = deepCopyPose(this.state.stickFigurePose);
        }
    }

    redistributeKeyframeTimes() {
        const numKeyframes = this.state.keyframes.length;
        if (numKeyframes < 1) return;

        if (numKeyframes === 1) {
            this.state.keyframes[0].time = 0;
            return;
        }
        
        this.state.keyframes.forEach((kf: Keyframe, index: number) => {
            kf.time = index / (numKeyframes - 1);
        });
    }

    getKeyframes(): Keyframe[] {
        return this.state.keyframes;
    }

    getActiveKeyframeIndex(): number | null {
        return this.state.activeKeyframeIndex;
    }

    setActiveKeyframeIndex(index: number | null) {
        this.state.activeKeyframeIndex = index;
    }

    getKeyframeCount(): number {
        return this.state.keyframes.length;
    }

    hasKeyframes(): boolean {
        return this.state.keyframes.length > 0;
    }

    hasMultipleKeyframes(): boolean {
        return this.state.keyframes.length >= 2;
    }
} 