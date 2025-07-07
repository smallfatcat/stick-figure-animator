
import { AppState } from './state';
import { Layout, drawUI, getTimelineMarkerRect } from './ui';
import { KinematicsData, calculatePointsFromPose } from './kinematics';
import { drawGuides, drawStickFigure, drawGrabHandles } from './drawing';
import { DOMElements } from './dom';

export function redraw(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    state: AppState,
    layout: Layout,
    kinematics: KinematicsData,
    domElements: DOMElements
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
        const baseOpacity = 0.4; // Slightly increased base opacity for better color visibility

        const drawOnionFrame = (frameIndex: number, distance: number, colorRgb: string) => {
             if (frameIndex >= 0 && frameIndex < state.keyframes.length) {
                const pose = state.keyframes[frameIndex]?.pose;
                if (pose && pose.hip && pose.angles) {
                    const opacity = baseOpacity / distance;
                    if (opacity > 0.05) { // Don't draw if it's basically invisible
                        const points = calculatePointsFromPose(pose, kinematics.hierarchy, kinematics.boneLengths, kinematics.children);
                        const style = `rgba(${colorRgb}, ${opacity})`;
                        drawStickFigure(ctx, points, { strokeStyle: style, fillStyle: style });
                    }
                }
            }
        };

        const beforeColorRgb = '255, 87, 34'; // A vibrant orange-red for past frames
        const afterColorRgb = '33, 150, 243';  // A clear, vibrant blue for future frames

        // Draw 'before' frames (red)
        for (let i = 1; i <= state.onionSkinBefore; i++) {
            drawOnionFrame(activeIndex - i, i, beforeColorRgb);
        }

        // Draw 'after' frames (blue)
        for (let i = 1; i <= state.onionSkinAfter; i++) {
            drawOnionFrame(activeIndex + i, i, afterColorRgb);
        }
    }
    
    const currentPoints = calculatePointsFromPose(state.stickFigurePose, kinematics.hierarchy, kinematics.boneLengths, kinematics.children);
    drawStickFigure(ctx, currentPoints);

    const grabRadius = 15;
    const isHoveringJoint = !state.isAnimating && !state.draggedMarkerIndex && drawGrabHandles(ctx, currentPoints, grabRadius, state.currentMousePos);

    drawUI(ctx, canvas.width, canvas.height, layout, state, kinematics);
    
    // Update cursor style based on current interactions
    if (state.draggedThumbnailIndex !== null) {
        canvas.style.cursor = 'grabbing';
    } else if (state.isAnimating && !state.isPaused) {
        canvas.style.cursor = 'default';
    } else if (state.isDraggingPlayhead) {
        canvas.style.cursor = 'grabbing';
    } else if (state.isDraggingGround) {
        canvas.style.cursor = 'ns-resize';
    } else if (state.isDraggingVerticalGuide) {
        canvas.style.cursor = 'ew-resize';
    } else if (state.draggedMarkerIndex !== null) {
        canvas.style.cursor = 'grabbing';
    } else if (state.hoveredThumbnailIndex !== null && state.hoveredDeleteIconIndex === null) {
        canvas.style.cursor = 'grab';
    } else if (state.hoveredPlayhead) {
        canvas.style.cursor = 'ew-resize';
    } else if (state.hoveredGround) {
        canvas.style.cursor = 'ns-resize';
    } else if (state.hoveredVerticalGuide) {
        canvas.style.cursor = 'ew-resize';
    } else if (state.hoveredMarkerIndex !== null) {
        canvas.style.cursor = 'grab';
    } else if (isHoveringJoint || state.hoveredDeleteIconIndex !== null || state.hoveredScrollLeft || state.hoveredScrollRight) {
        canvas.style.cursor = 'pointer';
    } else {
        canvas.style.cursor = 'default';
    }
}