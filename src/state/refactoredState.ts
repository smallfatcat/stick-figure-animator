import { StickFigurePose, Keyframe } from '../types';
import { Layout } from '../ui';
import { KinematicsData } from '../kinematics';
import { AnimationState, createAnimationState } from './animationState';
import { UIState, createUIState } from './uiState';
import { DragState, createDragState } from './dragState';
import { OnionState, createOnionState } from './onionState';
import { IKState, createIKState } from './ikState';

export interface RefactoredAppState {
    // Core data
    stickFigurePose: StickFigurePose;
    keyframes: Keyframe[];
    activeKeyframeIndex: number | null;
    
    // Visual guides
    groundY: number;
    verticalGuideX: number;
    
    // Focused state modules
    animation: AnimationState;
    ui: UIState;
    drag: DragState;
    onion: OnionState;
    ik: IKState;
}

export function createRefactoredAppState(kinematics: KinematicsData, layout: Layout): RefactoredAppState {
    return {
        stickFigurePose: JSON.parse(JSON.stringify(kinematics.defaultPose)),
        keyframes: [],
        activeKeyframeIndex: null,
        groundY: layout.GROUND_Y_POSITION,
        verticalGuideX: 50,
        animation: createAnimationState(),
        ui: createUIState(),
        drag: createDragState(),
        onion: createOnionState(),
        ik: createIKState(),
    };
}

// Helper functions to maintain backward compatibility
export function getAnimationState(state: RefactoredAppState): AnimationState {
    return state.animation;
}

export function getUIState(state: RefactoredAppState): UIState {
    return state.ui;
}

export function getDragState(state: RefactoredAppState): DragState {
    return state.drag;
}

export function getOnionState(state: RefactoredAppState): OnionState {
    return state.onion;
}

export function getIKState(state: RefactoredAppState): IKState {
    return state.ik;
}

// Compatibility: Convert RefactoredAppState to legacy AppState shape
export function toLegacyAppState(state: RefactoredAppState): any {
    return {
        stickFigurePose: state.stickFigurePose,
        keyframes: state.keyframes,
        activeKeyframeIndex: state.activeKeyframeIndex,
        groundY: state.groundY,
        verticalGuideX: state.verticalGuideX,
        // Animation
        isAnimating: state.animation.isAnimating,
        isPaused: state.animation.isPaused,
        animationMode: state.animation.animationMode,
        animationRequestId: state.animation.animationRequestId,
        animationStartTime: state.animation.animationStartTime,
        timeElapsedBeforePause: state.animation.timeElapsedBeforePause,
        animationTotalDuration: state.animation.animationTotalDuration,
        animationProgress: state.animation.animationProgress,
        timeDisplayMode: state.animation.timeDisplayMode,
        activeKeyframeIndexBeforeAnimation: state.animation.activeKeyframeIndexBeforeAnimation,
        // UI
        currentMousePos: state.ui.currentMousePos,
        hoveredThumbnailIndex: state.ui.hoveredThumbnailIndex,
        hoveredDeleteIconIndex: state.ui.hoveredDeleteIconIndex,
        hoveredScrollLeft: state.ui.hoveredScrollLeft,
        hoveredScrollRight: state.ui.hoveredScrollRight,
        hoveredGround: state.ui.hoveredGround,
        hoveredVerticalGuide: state.ui.hoveredVerticalGuide,
        hoveredMarkerIndex: state.ui.hoveredMarkerIndex,
        hoveredPlayhead: state.ui.hoveredPlayhead,
        hoveredJointKey: state.ui.hoveredJointKey,
        scrollOffset: state.ui.scrollOffset,
        dropTargetIndex: state.ui.dropTargetIndex,
        // Drag
        draggedPointKey: state.drag.draggedPointKey,
        isDraggingGround: state.drag.isDraggingGround,
        isDraggingVerticalGuide: state.drag.isDraggingVerticalGuide,
        draggedMarkerIndex: state.drag.draggedMarkerIndex,
        isDraggingPlayhead: state.drag.isDraggingPlayhead,
        draggedThumbnailIndex: state.drag.draggedThumbnailIndex,
        // Onion
        isOnionModeEnabled: state.onion.isOnionModeEnabled,
        onionSkinBefore: state.onion.onionSkinBefore,
        onionSkinAfter: state.onion.onionSkinAfter,
        isFullOnionSkinEnabled: state.onion.isFullOnionSkinEnabled,
        motionTrailResolution: state.onion.motionTrailResolution,
        onionTrailCanvas: state.onion.onionTrailCanvas,
        // IK
        isIKModeEnabled: state.ik.isIKModeEnabled,
        draggedEndEffector: state.ik.draggedEndEffector,
    };
}

// Two-way adapter: Convert RefactoredAppState to legacy AppState shape with write-back capability
export function createLegacyStateAdapter(state: RefactoredAppState): any {
    return {
        // Core data
        get stickFigurePose() { return state.stickFigurePose; },
        set stickFigurePose(value) { state.stickFigurePose = value; },
        
        get keyframes() { return state.keyframes; },
        set keyframes(value) { state.keyframes = value; },
        
        get activeKeyframeIndex() { return state.activeKeyframeIndex; },
        set activeKeyframeIndex(value) { state.activeKeyframeIndex = value; },
        
        get groundY() { return state.groundY; },
        set groundY(value) { state.groundY = value; },
        
        get verticalGuideX() { return state.verticalGuideX; },
        set verticalGuideX(value) { state.verticalGuideX = value; },
        
        // Animation
        get isAnimating() { return state.animation.isAnimating; },
        set isAnimating(value) { state.animation.isAnimating = value; },
        
        get isPaused() { return state.animation.isPaused; },
        set isPaused(value) { state.animation.isPaused = value; },
        
        get animationMode() { return state.animation.animationMode; },
        set animationMode(value) { state.animation.animationMode = value; },
        
        get animationRequestId() { return state.animation.animationRequestId; },
        set animationRequestId(value) { state.animation.animationRequestId = value; },
        
        get animationStartTime() { return state.animation.animationStartTime; },
        set animationStartTime(value) { state.animation.animationStartTime = value; },
        
        get timeElapsedBeforePause() { return state.animation.timeElapsedBeforePause; },
        set timeElapsedBeforePause(value) { state.animation.timeElapsedBeforePause = value; },
        
        get animationTotalDuration() { return state.animation.animationTotalDuration; },
        set animationTotalDuration(value) { state.animation.animationTotalDuration = value; },
        
        get animationProgress() { return state.animation.animationProgress; },
        set animationProgress(value) { state.animation.animationProgress = value; },
        
        get timeDisplayMode() { return state.animation.timeDisplayMode; },
        set timeDisplayMode(value) { state.animation.timeDisplayMode = value; },
        
        get activeKeyframeIndexBeforeAnimation() { return state.animation.activeKeyframeIndexBeforeAnimation; },
        set activeKeyframeIndexBeforeAnimation(value) { state.animation.activeKeyframeIndexBeforeAnimation = value; },
        
        // UI
        get currentMousePos() { return state.ui.currentMousePos; },
        set currentMousePos(value) { state.ui.currentMousePos = value; },
        
        get hoveredThumbnailIndex() { return state.ui.hoveredThumbnailIndex; },
        set hoveredThumbnailIndex(value) { state.ui.hoveredThumbnailIndex = value; },
        
        get hoveredDeleteIconIndex() { return state.ui.hoveredDeleteIconIndex; },
        set hoveredDeleteIconIndex(value) { state.ui.hoveredDeleteIconIndex = value; },
        
        get hoveredScrollLeft() { return state.ui.hoveredScrollLeft; },
        set hoveredScrollLeft(value) { state.ui.hoveredScrollLeft = value; },
        
        get hoveredScrollRight() { return state.ui.hoveredScrollRight; },
        set hoveredScrollRight(value) { state.ui.hoveredScrollRight = value; },
        
        get hoveredGround() { return state.ui.hoveredGround; },
        set hoveredGround(value) { state.ui.hoveredGround = value; },
        
        get hoveredVerticalGuide() { return state.ui.hoveredVerticalGuide; },
        set hoveredVerticalGuide(value) { state.ui.hoveredVerticalGuide = value; },
        
        get hoveredMarkerIndex() { return state.ui.hoveredMarkerIndex; },
        set hoveredMarkerIndex(value) { state.ui.hoveredMarkerIndex = value; },
        
        get hoveredPlayhead() { return state.ui.hoveredPlayhead; },
        set hoveredPlayhead(value) { state.ui.hoveredPlayhead = value; },
        
        get hoveredJointKey() { return state.ui.hoveredJointKey; },
        set hoveredJointKey(value) { state.ui.hoveredJointKey = value; },
        
        get scrollOffset() { return state.ui.scrollOffset; },
        set scrollOffset(value) { state.ui.scrollOffset = value; },
        
        get dropTargetIndex() { return state.ui.dropTargetIndex; },
        set dropTargetIndex(value) { state.ui.dropTargetIndex = value; },
        
        // Drag
        get draggedPointKey() { return state.drag.draggedPointKey; },
        set draggedPointKey(value) { state.drag.draggedPointKey = value; },
        
        get isDraggingGround() { return state.drag.isDraggingGround; },
        set isDraggingGround(value) { state.drag.isDraggingGround = value; },
        
        get isDraggingVerticalGuide() { return state.drag.isDraggingVerticalGuide; },
        set isDraggingVerticalGuide(value) { state.drag.isDraggingVerticalGuide = value; },
        
        get draggedMarkerIndex() { return state.drag.draggedMarkerIndex; },
        set draggedMarkerIndex(value) { state.drag.draggedMarkerIndex = value; },
        
        get isDraggingPlayhead() { return state.drag.isDraggingPlayhead; },
        set isDraggingPlayhead(value) { state.drag.isDraggingPlayhead = value; },
        
        get draggedThumbnailIndex() { return state.drag.draggedThumbnailIndex; },
        set draggedThumbnailIndex(value) { state.drag.draggedThumbnailIndex = value; },
        
        // Onion
        get isOnionModeEnabled() { return state.onion.isOnionModeEnabled; },
        set isOnionModeEnabled(value) { state.onion.isOnionModeEnabled = value; },
        
        get onionSkinBefore() { return state.onion.onionSkinBefore; },
        set onionSkinBefore(value) { state.onion.onionSkinBefore = value; },
        
        get onionSkinAfter() { return state.onion.onionSkinAfter; },
        set onionSkinAfter(value) { state.onion.onionSkinAfter = value; },
        
        get isFullOnionSkinEnabled() { return state.onion.isFullOnionSkinEnabled; },
        set isFullOnionSkinEnabled(value) { state.onion.isFullOnionSkinEnabled = value; },
        
        get motionTrailResolution() { return state.onion.motionTrailResolution; },
        set motionTrailResolution(value) { state.onion.motionTrailResolution = value; },
        
        get onionTrailCanvas() { return state.onion.onionTrailCanvas; },
        set onionTrailCanvas(value) { state.onion.onionTrailCanvas = value; },
        
        // IK
        get isIKModeEnabled() { return state.ik.isIKModeEnabled; },
        set isIKModeEnabled(value) { state.ik.isIKModeEnabled = value; },
        
        get draggedEndEffector() { return state.ik.draggedEndEffector; },
        set draggedEndEffector(value) { state.ik.draggedEndEffector = value; },
    };
} 