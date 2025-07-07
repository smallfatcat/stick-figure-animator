
import { Point, StickFigurePoints, StickFigurePose, Keyframe } from './types';
import { Layout } from './ui';
import { KinematicsData } from './kinematics';

export interface AppState {
  stickFigurePose: StickFigurePose;
  keyframes: Keyframe[];
  activeKeyframeIndex: number | null;
  activeKeyframeIndexBeforeAnimation: number | null;
  groundY: number;
  verticalGuideX: number;
  
  draggedPointKey: keyof StickFigurePoints | null;
  isDraggingGround: boolean;
  isDraggingVerticalGuide: boolean;
  draggedMarkerIndex: number | null;
  isDraggingPlayhead: boolean;
  draggedThumbnailIndex: number | null; // For D&D reordering

  currentMousePos: Point | null;
  
  hoveredThumbnailIndex: number | null;
  hoveredDeleteIconIndex: number | null;
  hoveredScrollLeft: boolean;
  hoveredScrollRight: boolean;
  hoveredGround: boolean;
  hoveredVerticalGuide: boolean;
  hoveredMarkerIndex: number | null;
  hoveredPlayhead: boolean;
  scrollOffset: number;
  dropTargetIndex: number | null; // For D&D reordering
  
  isOnionModeEnabled: boolean;
  onionSkinBefore: number;
  onionSkinAfter: number;
  isFullOnionSkinEnabled: boolean;
  motionTrailResolution: number;
  onionTrailCanvas: HTMLCanvasElement | null;

  isAnimating: boolean;
  isPaused: boolean;
  animationMode: 'loop' | 'ping-pong';
  animationRequestId: number | null;
  animationStartTime: number | null;
  timeElapsedBeforePause: number;
  animationTotalDuration: number;
  animationProgress: number;
  timeDisplayMode: 'seconds' | 'frames';
  
  // IK Mode
  isIKModeEnabled: boolean;
  draggedEndEffector: keyof StickFigurePoints | null;
}

export function createAppState(kinematics: KinematicsData, layout: Layout): AppState {
    return {
        stickFigurePose: JSON.parse(JSON.stringify(kinematics.defaultPose)),
        keyframes: [],
        activeKeyframeIndex: null,
        activeKeyframeIndexBeforeAnimation: null,
        groundY: layout.GROUND_Y_POSITION,
        verticalGuideX: 50,
        draggedPointKey: null,
        isDraggingGround: false,
        isDraggingVerticalGuide: false,
        draggedMarkerIndex: null,
        isDraggingPlayhead: false,
        draggedThumbnailIndex: null,
        currentMousePos: null,
        hoveredThumbnailIndex: null,
        hoveredDeleteIconIndex: null,
        hoveredScrollLeft: false,
        hoveredScrollRight: false,
        hoveredGround: false,
        hoveredVerticalGuide: false,
        hoveredMarkerIndex: null,
        hoveredPlayhead: false,
        scrollOffset: 0,
        dropTargetIndex: null,
        isOnionModeEnabled: false,
        onionSkinBefore: 5,
        onionSkinAfter: 5,
        isFullOnionSkinEnabled: false,
        motionTrailResolution: 1,
        onionTrailCanvas: null,
        isAnimating: false,
        isPaused: false,
        animationMode: 'loop',
        animationRequestId: null,
        animationStartTime: null,
        timeElapsedBeforePause: 0,
        animationTotalDuration: 5000,
        animationProgress: 0,
        timeDisplayMode: 'seconds',
        isIKModeEnabled: false,
        draggedEndEffector: null,
    };
}