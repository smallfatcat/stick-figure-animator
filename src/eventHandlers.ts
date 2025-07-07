import { AppState } from './state';
import { DOMElements } from './dom';
import { Layout, getDeleteButtonRect, getTimelineMarkerRect } from './ui';
import { KinematicsData, calculatePointsFromPose } from './kinematics';
import { startAnimation, stopAnimation, pauseAnimation, resumeAnimation } from './animationLoop';
import { autoSaveCurrentPoseIfActive, redistributeKeyframeTimes, addKeyframe, deleteKeyframe } from './keyframeManager';
import { getMousePos, isInside, exportKeyframesAsJSON, loadKeyframesFromFile } from './utils';
import { Rect, StickFigurePoints, Keyframe } from './types';

type RedrawFunction = () => void;

export function setupEventHandlers(
    dom: DOMElements, 
    state: AppState, 
    layout: Layout, 
    kinematics: KinematicsData,
    redraw: RedrawFunction
) {
    const { canvas, animateBtn, pauseBtn, modeBtn, onionBtn, exportBtn, importBtn, importInput, durationInput } = dom;
    const { defaultPose, hierarchy, boneLengths, children } = kinematics;
    const grabRadius = 15;
    const GUIDE_GRAB_BUFFER = 10;

    animateBtn.addEventListener('click', () => {
        if (state.isAnimating) {
            stopAnimation(state, redraw);
        } else if (state.keyframes.length >= 2) {
            autoSaveCurrentPoseIfActive(state);
            startAnimation(state, redraw);
        }
    });

    pauseBtn.addEventListener('click', () => {
        if (!state.isAnimating) return;
        if (state.isPaused) {
            resumeAnimation(state, redraw);
        } else {
            pauseAnimation(state, redraw);
        }
    });

    modeBtn.addEventListener('click', () => {
        if (state.isAnimating || state.keyframes.length < 2) return;
        state.animationMode = state.animationMode === 'loop' ? 'ping-pong' : 'loop';
        redraw();
    });

    onionBtn.addEventListener('click', () => {
        if (state.isAnimating || state.activeKeyframeIndex === null) return;
        state.isOnionModeEnabled = !state.isOnionModeEnabled;
        redraw();
    });

    exportBtn.addEventListener('click', () => {
        if (state.isAnimating || state.keyframes.length === 0) return;
        autoSaveCurrentPoseIfActive(state);
        exportKeyframesAsJSON(state.keyframes);
    });

    importBtn.addEventListener('click', () => {
        if (state.isAnimating) return;
        importInput.click();
    });

    importInput.addEventListener('change', async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            try {
                autoSaveCurrentPoseIfActive(state);
                const loadedKfs = await loadKeyframesFromFile(file);
                state.keyframes = loadedKfs;
                state.activeKeyframeIndex = state.keyframes.length > 0 ? 0 : null;
                state.scrollOffset = 0;
                state.stickFigurePose = state.keyframes.length > 0 ? JSON.parse(JSON.stringify(state.keyframes[0].pose)) : JSON.parse(JSON.stringify(defaultPose));
                state.isOnionModeEnabled = false;
                redraw();
            } catch (error) {
                alert("Failed to load keyframes. Please check the file format.");
            }
        }
        (e.target as HTMLInputElement).value = '';
    });

    durationInput.addEventListener('change', () => {
        const newDuration = parseFloat(durationInput.value);
        if (!isNaN(newDuration) && newDuration > 0) {
            state.animationTotalDuration = newDuration * 1000;
        } else {
            durationInput.value = (state.animationTotalDuration / 1000).toString();
            alert("Invalid duration. Please enter a positive number.");
        }
    });

    canvas.addEventListener('mousedown', (e) => {
        const mousePos = getMousePos(canvas, e);
        if (state.isAnimating) return;

        if (state.hoveredMarkerIndex !== null) {
            if (state.activeKeyframeIndex !== state.hoveredMarkerIndex) {
                autoSaveCurrentPoseIfActive(state);
                state.activeKeyframeIndex = state.hoveredMarkerIndex;
                state.stickFigurePose = JSON.parse(JSON.stringify(state.keyframes[state.hoveredMarkerIndex].pose));

                if (state.activeKeyframeIndex < state.scrollOffset) {
                    state.scrollOffset = state.activeKeyframeIndex;
                } else if (state.activeKeyframeIndex >= state.scrollOffset + layout.VISIBLE_THUMBNAILS) {
                    state.scrollOffset = state.activeKeyframeIndex - layout.VISIBLE_THUMBNAILS + 1;
                }
            }
            if (state.hoveredMarkerIndex > 0 && state.hoveredMarkerIndex < state.keyframes.length - 1) {
                state.draggedMarkerIndex = state.hoveredMarkerIndex;
            }
            redraw();
            return;
        }

        const horizontalGrabberRect: Rect = { x: 0, y: state.groundY - GUIDE_GRAB_BUFFER, width: layout.GUIDE_GRABBER_SIZE, height: GUIDE_GRAB_BUFFER * 2 };
        if (isInside(mousePos, horizontalGrabberRect) && mousePos.y < layout.POSING_AREA_HEIGHT) {
            state.isDraggingGround = true;
            return;
        }
        const verticalGrabberRect: Rect = { x: state.verticalGuideX - GUIDE_GRAB_BUFFER, y: layout.POSING_AREA_HEIGHT - layout.GUIDE_GRABBER_SIZE, width: GUIDE_GRAB_BUFFER * 2, height: layout.GUIDE_GRABBER_SIZE };
        if (isInside(mousePos, verticalGrabberRect) && mousePos.y < layout.POSING_AREA_HEIGHT) {
            state.isDraggingVerticalGuide = true;
            return;
        }

        if (state.hoveredDeleteIconIndex !== null) {
            deleteKeyframe(state, state.hoveredDeleteIconIndex, defaultPose, layout);
            redraw();
            return;
        }

        if (isInside(mousePos, layout.SCROLL_LEFT_BUTTON_RECT)) {
            state.scrollOffset = Math.max(0, state.scrollOffset - 1);
            redraw(); return;
        }
        if (isInside(mousePos, layout.SCROLL_RIGHT_BUTTON_RECT)) {
            state.scrollOffset = Math.min(state.scrollOffset + 1, Math.max(0, state.keyframes.length - layout.VISIBLE_THUMBNAILS));
            redraw(); return;
        }

        for (let i = 0; i < layout.THUMBNAIL_RECTS.length; i++) {
            const clickedIndex = state.scrollOffset + i;
            if (isInside(mousePos, layout.THUMBNAIL_RECTS[i]) && state.keyframes[clickedIndex]) {
                if (state.activeKeyframeIndex !== clickedIndex) {
                     autoSaveCurrentPoseIfActive(state);
                     state.activeKeyframeIndex = clickedIndex;
                     state.stickFigurePose = JSON.parse(JSON.stringify(state.keyframes[clickedIndex].pose));
                     redraw();
                }
                return;
            }
        }
        
        const currentPoints = calculatePointsFromPose(state.stickFigurePose, hierarchy, boneLengths, children);
        let closestPoint: keyof StickFigurePoints | null = null;
        let minDistance = Infinity;
        for (const key in currentPoints) {
            const pointKey = key as keyof StickFigurePoints;
            const distance = Math.hypot(mousePos.x - currentPoints[pointKey].x, mousePos.y - currentPoints[pointKey].y);
            if (distance < grabRadius && distance < minDistance) {
                minDistance = distance;
                closestPoint = pointKey;
            }
        }
        state.draggedPointKey = closestPoint;

        if (!state.draggedPointKey && mousePos.y < layout.POSING_AREA_HEIGHT) {
            addKeyframe(state, layout);
            redraw();
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const mousePos = getMousePos(canvas, e);
        state.currentMousePos = mousePos;

        if (state.draggedMarkerIndex !== null) {
            const timelineRect = layout.TIMELINE_RECT;
            let newTime = (mousePos.x - timelineRect.x) / timelineRect.width;

            const prevTime = state.keyframes[state.draggedMarkerIndex - 1].time;
            const nextTime = state.keyframes[state.draggedMarkerIndex + 1].time;
            
            newTime = Math.max(prevTime, Math.min(newTime, nextTime));
            
            state.keyframes[state.draggedMarkerIndex].time = newTime;
            redraw();
            return;
        }

        if (state.isDraggingGround && !state.isAnimating) {
            state.groundY = Math.max(0, Math.min(mousePos.y, layout.POSING_AREA_HEIGHT));
            redraw();
            return;
        }
        if (state.isDraggingVerticalGuide && !state.isAnimating) {
            state.verticalGuideX = Math.max(0, Math.min(mousePos.x, canvas.width));
            redraw();
            return;
        }
        
        // Reset hover states
        state.hoveredScrollLeft = false;
        state.hoveredScrollRight = false;
        state.hoveredThumbnailIndex = null;
        state.hoveredDeleteIconIndex = null;
        state.hoveredMarkerIndex = null;
        state.hoveredGround = false;
        state.hoveredVerticalGuide = false;

        if (!state.isAnimating) {
            state.hoveredScrollLeft = isInside(mousePos, layout.SCROLL_LEFT_BUTTON_RECT);
            state.hoveredScrollRight = isInside(mousePos, layout.SCROLL_RIGHT_BUTTON_RECT);

            for(let i=0; i < state.keyframes.length; i++) {
                const markerRect = getTimelineMarkerRect(state.keyframes[i], layout.TIMELINE_RECT);
                if (isInside(mousePos, markerRect)) {
                    state.hoveredMarkerIndex = i;
                    break;
                }
            }

            if (mousePos.y < layout.POSING_AREA_HEIGHT) {
                const horizontalGrabberRect: Rect = { x: 0, y: state.groundY - GUIDE_GRAB_BUFFER, width: layout.GUIDE_GRABBER_SIZE, height: GUIDE_GRAB_BUFFER * 2 };
                const verticalGrabberRect: Rect = { x: state.verticalGuideX - GUIDE_GRAB_BUFFER, y: layout.POSING_AREA_HEIGHT - layout.GUIDE_GRABBER_SIZE, width: GUIDE_GRAB_BUFFER * 2, height: layout.GUIDE_GRABBER_SIZE };

                if (isInside(mousePos, horizontalGrabberRect)) state.hoveredGround = true;
                else if (isInside(mousePos, verticalGrabberRect)) state.hoveredVerticalGuide = true;
            }

            for (let i = 0; i < layout.THUMBNAIL_RECTS.length; i++) {
                const thumbRect = layout.THUMBNAIL_RECTS[i];
                const actualIndex = state.scrollOffset + i;
                if (state.keyframes[actualIndex] && isInside(mousePos, thumbRect)) {
                    state.hoveredThumbnailIndex = actualIndex; 

                    const deleteRect = getDeleteButtonRect(thumbRect);
                    if (isInside(mousePos, deleteRect)) {
                        state.hoveredDeleteIconIndex = actualIndex;
                        state.hoveredThumbnailIndex = null; // Prioritize delete hover
                        break; 
                    }
                }
            }
        }

        if (state.draggedPointKey && !state.isAnimating) {
            mousePos.y = Math.min(mousePos.y, layout.POSING_AREA_HEIGHT - 2);

            if (state.draggedPointKey === 'hip') {
                state.stickFigurePose.hip = mousePos;
            } else {
                const parentKey = hierarchy[state.draggedPointKey as keyof typeof hierarchy]!;
                const currentPoints = calculatePointsFromPose(state.stickFigurePose, hierarchy, boneLengths, children);
                const parentPos = currentPoints[parentKey as keyof StickFigurePoints];
                
                const newAngle = Math.atan2(mousePos.y - parentPos.y, mousePos.x - parentPos.x);
                state.stickFigurePose.angles[state.draggedPointKey] = newAngle;
            }
        }
        redraw();
    });

    canvas.addEventListener('mouseup', () => { 
        state.draggedPointKey = null;
        state.isDraggingGround = false;
        state.isDraggingVerticalGuide = false;
        state.draggedMarkerIndex = null;
    });

    canvas.addEventListener('mouseleave', () => {
        state.draggedPointKey = null;
        state.isDraggingGround = false;
        state.isDraggingVerticalGuide = false;
        state.draggedMarkerIndex = null;
        state.currentMousePos = null;
        if(!state.isAnimating){
            state.hoveredScrollLeft = false;
            state.hoveredScrollRight = false;
            state.hoveredThumbnailIndex = null;
            state.hoveredDeleteIconIndex = null;
            state.hoveredGround = false;
            state.hoveredVerticalGuide = false;
            state.hoveredMarkerIndex = null;
        }
        redraw();
    });

    window.addEventListener('keydown', (e) => {
        if (state.isAnimating || (document.activeElement && document.activeElement.tagName === 'INPUT') || state.isDraggingGround || state.isDraggingVerticalGuide || state.draggedMarkerIndex !== null) {
            return;
        }

        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            if (state.keyframes.length === 0) return;

            let nextIndex: number;
            if (state.activeKeyframeIndex === null) {
                nextIndex = (e.key === 'ArrowLeft') ? state.keyframes.length - 1 : 0;
            } else {
                nextIndex = (e.key === 'ArrowLeft') ? state.activeKeyframeIndex - 1 : state.activeKeyframeIndex + 1;
            }
            
            if (nextIndex >= 0 && nextIndex < state.keyframes.length) {
                autoSaveCurrentPoseIfActive(state);

                state.activeKeyframeIndex = nextIndex;
                state.stickFigurePose = JSON.parse(JSON.stringify(state.keyframes[state.activeKeyframeIndex].pose));

                if (state.activeKeyframeIndex < state.scrollOffset) {
                    state.scrollOffset = state.activeKeyframeIndex;
                } else if (state.activeKeyframeIndex >= state.scrollOffset + layout.VISIBLE_THUMBNAILS) {
                    state.scrollOffset = state.activeKeyframeIndex - layout.VISIBLE_THUMBNAILS + 1;
                }
                redraw();
            }
        }
    });
}
