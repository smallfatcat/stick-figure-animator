import { AppState } from './state';
import { Layout, drawUI } from './ui';
import { KinematicsData, calculatePointsFromPose } from './kinematics';
import { drawGuides, drawStickFigure, drawGrabHandles } from './drawing';
import { DOMElements } from './dom';

export function redrawPosingCanvas(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    state: AppState,
    layout: Layout,
    kinematics: KinematicsData
) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.activeKeyframeIndex !== null) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Keyframe: ${state.activeKeyframeIndex + 1} / ${state.keyframes.length}`, 15, 15);
        ctx.restore();
    }
    
    drawGuides(ctx, state.groundY, state.verticalGuideX, canvas.width, layout.POSING_AREA_HEIGHT, layout.GUIDE_GRABBER_SIZE, state.hoveredGround, state.hoveredVerticalGuide);
    
    // Draw the pre-rendered full onion skin trail if it exists
    if (state.isAnimating && state.onionTrailCanvas) {
        ctx.drawImage(state.onionTrailCanvas, 0, 0);
    }
    
    if (state.isOnionModeEnabled && state.activeKeyframeIndex !== null) {
        const activeIndex = state.activeKeyframeIndex;
        const baseOpacity = 0.4;

        const drawOnionFrame = (frameIndex: number, distance: number, colorRgb: string) => {
             if (frameIndex >= 0 && frameIndex < state.keyframes.length) {
                const pose = state.keyframes[frameIndex]?.pose;
                if (pose && pose.hip && pose.angles) {
                    const opacity = baseOpacity / distance;
                    if (opacity > 0.05) {
                        const points = calculatePointsFromPose(pose, kinematics.hierarchy, kinematics.boneLengths, kinematics.children);
                        const style = `rgba(${colorRgb}, ${opacity})`;
                        drawStickFigure(ctx, points, { strokeStyle: style, fillStyle: style });
                    }
                }
            }
        };

        const beforeColorRgb = '255, 87, 34';
        const afterColorRgb = '33, 150, 243';

        for (let i = 1; i <= state.onionSkinBefore; i++) {
            drawOnionFrame(activeIndex - i, i, beforeColorRgb);
        }

        for (let i = 1; i <= state.onionSkinAfter; i++) {
            drawOnionFrame(activeIndex + i, i, afterColorRgb);
        }
    }
    
    const currentPoints = calculatePointsFromPose(state.stickFigurePose, kinematics.hierarchy, kinematics.boneLengths, kinematics.children);
    drawStickFigure(ctx, currentPoints);

    const grabRadius = 15;
    !state.isAnimating && !state.draggedMarkerIndex && drawGrabHandles(ctx, currentPoints, grabRadius, state.hoveredJointKey, state.isIKModeEnabled);
}

export function redrawUICanvas(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    state: AppState,
    layout: Layout,
    kinematics: KinematicsData
) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawUI(ctx, canvas.width, canvas.height, layout, state, kinematics);
}

export function updateCursor(
    posingCanvas: HTMLCanvasElement,
    uiCanvas: HTMLCanvasElement,
    state: AppState
) {
    let posingCursor = 'default';
    let uiCursor = 'default';

    if (state.isAnimating && !state.isPaused) {
        // No special cursor during animation
    } else if (state.isDraggingGround) {
        posingCursor = 'ns-resize';
    } else if (state.isDraggingVerticalGuide) {
        posingCursor = 'ew-resize';
    } else if (state.hoveredJointKey) {
        posingCursor = 'pointer';
    } else if (state.hoveredGround) {
        posingCursor = 'ns-resize';
    } else if (state.hoveredVerticalGuide) {
        posingCursor = 'ew-resize';
    }

    if (state.draggedThumbnailIndex !== null) {
        uiCursor = 'grabbing';
    } else if (state.isDraggingPlayhead) {
        uiCursor = 'grabbing';
    } else if (state.draggedMarkerIndex !== null) {
        uiCursor = 'grabbing';
    } else if (state.hoveredThumbnailIndex !== null && state.hoveredDeleteIconIndex === null) {
        uiCursor = 'grab';
    } else if (state.hoveredPlayhead) {
        uiCursor = 'ew-resize';
    } else if (state.hoveredMarkerIndex !== null) {
        uiCursor = 'grab';
    } else if (state.hoveredDeleteIconIndex !== null || state.hoveredScrollLeft || state.hoveredScrollRight) {
        uiCursor = 'pointer';
    }

    posingCanvas.style.cursor = posingCursor;
    uiCanvas.style.cursor = uiCursor;
}