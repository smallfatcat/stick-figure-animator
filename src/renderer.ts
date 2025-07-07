import { AppState } from './state';
import { Layout, drawUI, getTimelineMarkerRect } from './ui';
import { KinematicsData, calculatePointsFromPose } from './kinematics';
import { drawGuides, drawStickFigure, drawGrabHandles } from './drawing';
import { DOMElements } from './dom';
import { updateControlsState } from './controls';

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
    
    if (state.isOnionModeEnabled && state.activeKeyframeIndex !== null) {
        if (state.activeKeyframeIndex > 0) {
            const prevPose = state.keyframes[state.activeKeyframeIndex - 1]?.pose;
            if (prevPose && prevPose.hip && prevPose.angles) {
                const prevPoints = calculatePointsFromPose(prevPose, kinematics.hierarchy, kinematics.boneLengths, kinematics.children);
                drawStickFigure(ctx, prevPoints, { strokeStyle: 'rgba(255, 255, 255, 0.25)', fillStyle: 'rgba(255, 255, 255, 0.25)' });
            }
        }
        if (state.activeKeyframeIndex < state.keyframes.length - 1) {
            const nextPose = state.keyframes[state.activeKeyframeIndex + 1]?.pose;
            if (nextPose && nextPose.hip && nextPose.angles) {
                const nextPoints = calculatePointsFromPose(nextPose, kinematics.hierarchy, kinematics.boneLengths, kinematics.children);
                drawStickFigure(ctx, nextPoints, { strokeStyle: 'rgba(255, 255, 255, 0.25)', fillStyle: 'rgba(255, 255, 255, 0.25)' });
            }
        }
    }
    
    const currentPoints = calculatePointsFromPose(state.stickFigurePose, kinematics.hierarchy, kinematics.boneLengths, kinematics.children);
    drawStickFigure(ctx, currentPoints);

    const grabRadius = 15;
    const isHoveringJoint = !state.isAnimating && !state.draggedMarkerIndex && drawGrabHandles(ctx, currentPoints, grabRadius, state.currentMousePos);

    drawUI(ctx, canvas.width, canvas.height, layout, state, kinematics);
    
    updateControlsState(domElements, state);

    // Update cursor style based on current interactions
    if (state.isAnimating) {
        canvas.style.cursor = 'default';
    } else if (state.hoveredGround) {
        canvas.style.cursor = 'ns-resize';
    } else if (state.hoveredVerticalGuide) {
        canvas.style.cursor = 'ew-resize';
    } else if (state.draggedMarkerIndex !== null) {
        canvas.style.cursor = 'grabbing';
    } else if (state.hoveredMarkerIndex !== null) {
        canvas.style.cursor = 'grab';
    } else if (isHoveringJoint || state.hoveredThumbnailIndex !== null || state.hoveredDeleteIconIndex !== null || state.hoveredScrollLeft || state.hoveredScrollRight) {
        canvas.style.cursor = 'pointer';
    } else {
        canvas.style.cursor = 'default';
    }
}
