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

  currentMousePos: Point | null;
  
  hoveredThumbnailIndex: number | null;
  hoveredDeleteIconIndex: number | null;
  hoveredScrollLeft: boolean;
  hoveredScrollRight: boolean;
  hoveredGround: boolean;
  hoveredVerticalGuide: boolean;
  hoveredMarkerIndex: number | null;
  scrollOffset: number;
  
  isOnionModeEnabled: boolean;

  isAnimating: boolean;
  isPaused: boolean;
  animationMode: 'loop' | 'ping-pong';
  animationRequestId: number | null;
  animationStartTime: number | null;
  timeElapsedBeforePause: number;
  animationTotalDuration: number;
  animationProgress: number | null;
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
        currentMousePos: null,
        hoveredThumbnailIndex: null,
        hoveredDeleteIconIndex: null,
        hoveredScrollLeft: false,
        hoveredScrollRight: false,
        hoveredGround: false,
        hoveredVerticalGuide: false,
        hoveredMarkerIndex: null,
        scrollOffset: 0,
        isOnionModeEnabled: false,
        isAnimating: false,
        isPaused: false,
        animationMode: 'loop',
        animationRequestId: null,
        animationStartTime: null,
        timeElapsedBeforePause: 0,
        animationTotalDuration: 5000,
        animationProgress: null,
    };
}
