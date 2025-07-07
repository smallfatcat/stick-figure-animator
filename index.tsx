import './index.css';

import { Point, StickFigurePoints, StickFigurePose, Rect, Keyframe } from './src/types';
import { createDefaultKinematics, calculatePointsFromPose } from './src/kinematics';
import { drawGuides, drawStickFigure, drawGrabHandles } from './src/drawing';
import { createLayout, drawUI, getDeleteButtonRect, getTimelineMarkerRect } from './src/ui';
import { interpolatePose } from './src/animation';
import { getMousePos, isInside, exportKeyframesAsJSON, loadKeyframesFromFile } from './src/utils';


function main() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) { return; }
  const importInput = document.getElementById('import-input') as HTMLInputElement;
  if (!importInput) { return; }
  const durationInput = document.getElementById('duration-input') as HTMLInputElement;
  if (!durationInput) { return; }

  canvas.width = 800;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) { return; }

  // --- Layout & Kinematics Initialization ---
  const layout = createLayout(canvas.width, canvas.height);
  const kinematics = createDefaultKinematics(canvas.width, layout.POSING_AREA_HEIGHT);
  const { hierarchy, children, boneLengths, defaultPose } = kinematics;

  // --- State Initialization ---
  let stickFigurePose: StickFigurePose = JSON.parse(JSON.stringify(defaultPose));
  let keyframes: Keyframe[] = [];
  let activeKeyframeIndex: number | null = null;
  let activeKeyframeIndexBeforeAnimation: number | null = null;
  let groundY: number = layout.GROUND_Y_POSITION;
  let verticalGuideX: number = 50;
  
  let draggedPointKey: keyof StickFigurePoints | null = null;
  let isDraggingGround = false;
  let isDraggingVerticalGuide = false;
  let draggedMarkerIndex: number | null = null;

  let currentMousePos: Point | null = null;
  const grabRadius = 15;
  const GUIDE_GRAB_BUFFER = 10;
  
  let hoveredAnimateButton = false, hoveredPauseButton = false, hoveredModeButton = false, hoveredOnionButton = false, hoveredExportButton = false, hoveredImportButton = false, hoveredThumbnailIndex: number | null = null, hoveredDeleteIconIndex: number | null = null, hoveredScrollLeft = false, hoveredScrollRight = false;
  let hoveredGround = false, hoveredVerticalGuide = false;
  let hoveredMarkerIndex: number | null = null;
  let scrollOffset = 0;
  
  let isOnionModeEnabled = false;

  let isAnimating = false;
  let isPaused = false;
  let animationMode: 'loop' | 'ping-pong' = 'loop';
  let animationRequestId: number | null = null;
  let animationStartTime: number | null = null;
  let timeElapsedBeforePause = 0;
  let animationTotalDuration = 5000; // 5 seconds
  let animationProgress: number | null = null;


  // --- Core Logic ---

  function redistributeKeyframeTimes() {
      const numKeyframes = keyframes.length;
      if (numKeyframes < 1) return;
      
      keyframes.sort((a, b) => a.time - b.time);

      if (numKeyframes === 1) {
          keyframes[0].time = 0;
          return;
      }
      
      keyframes.forEach((kf, index) => {
          kf.time = index / (numKeyframes - 1);
      });
  }

  function autoSaveCurrentPoseIfActive() {
    if (activeKeyframeIndex !== null && keyframes[activeKeyframeIndex]) {
      keyframes[activeKeyframeIndex].pose = JSON.parse(JSON.stringify(stickFigurePose));
    }
  }

  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (activeKeyframeIndex !== null) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Keyframe: ${activeKeyframeIndex + 1} / ${keyframes.length}`, 15, 15);
        ctx.restore();
    }
    
    drawGuides(ctx, groundY, verticalGuideX, canvas.width, layout.POSING_AREA_HEIGHT, layout.GUIDE_GRABBER_SIZE, hoveredGround, hoveredVerticalGuide);
    
    if (isOnionModeEnabled && activeKeyframeIndex !== null) {
        if (activeKeyframeIndex > 0) {
            const prevPose = keyframes[activeKeyframeIndex - 1]?.pose;
            if (prevPose && prevPose.hip && prevPose.angles) {
                const prevPoints = calculatePointsFromPose(prevPose, hierarchy, boneLengths, children);
                drawStickFigure(ctx, prevPoints, { strokeStyle: 'rgba(255, 255, 255, 0.25)', fillStyle: 'rgba(255, 255, 255, 0.25)' });
            }
        }
        if (activeKeyframeIndex < keyframes.length - 1) {
            const nextPose = keyframes[activeKeyframeIndex + 1]?.pose;
            if (nextPose && nextPose.hip && nextPose.angles) {
                const nextPoints = calculatePointsFromPose(nextPose, hierarchy, boneLengths, children);
                drawStickFigure(ctx, nextPoints, { strokeStyle: 'rgba(255, 255, 255, 0.25)', fillStyle: 'rgba(255, 255, 255, 0.25)' });
            }
        }
    }
    
    const currentPoints = calculatePointsFromPose(stickFigurePose, hierarchy, boneLengths, children);
    drawStickFigure(ctx, currentPoints);

    const isHoveringJoint = !isAnimating && !draggedMarkerIndex && drawGrabHandles(ctx, currentPoints, grabRadius, currentMousePos);

    const state = { stickFigurePose, keyframes, activeKeyframeIndex, isOnionModeEnabled, hoveredAnimateButton, hoveredPauseButton, hoveredModeButton, hoveredOnionButton, hoveredExportButton, hoveredImportButton, hoveredThumbnailIndex, hoveredDeleteIconIndex, scrollOffset, hoveredScrollLeft, hoveredScrollRight, isAnimating, isPaused, animationMode, hoveredMarkerIndex, animationTotalDuration, animationProgress };
    drawUI(ctx, canvas.width, canvas.height, layout, state, kinematics);
    
    if (isAnimating) {
        canvas.style.cursor = (hoveredAnimateButton || hoveredPauseButton) ? 'pointer' : 'default';
    } else if (hoveredGround) {
        canvas.style.cursor = 'ns-resize';
    } else if (hoveredVerticalGuide) {
        canvas.style.cursor = 'ew-resize';
    } else if (draggedMarkerIndex !== null) {
        canvas.style.cursor = 'grabbing';
    } else if (hoveredMarkerIndex !== null) {
        canvas.style.cursor = 'grab';
    } else if (isHoveringJoint || hoveredThumbnailIndex !== null || hoveredDeleteIconIndex !== null || hoveredAnimateButton || hoveredPauseButton || hoveredModeButton || hoveredOnionButton || hoveredExportButton || hoveredImportButton || hoveredScrollLeft || hoveredScrollRight) {
        canvas.style.cursor = 'pointer';
    } else {
        canvas.style.cursor = 'default';
    }
  }

  function stopAnimation() {
      if (animationRequestId) cancelAnimationFrame(animationRequestId);
      animationRequestId = null;
      isAnimating = false;
      isPaused = false;
      animationProgress = null;
      durationInput.disabled = false;

      activeKeyframeIndex = activeKeyframeIndexBeforeAnimation;

      // After animation, reset the live pose to a defined state to avoid
      // saving an intermediate animation pose as a keyframe.
      if (activeKeyframeIndex !== null && keyframes[activeKeyframeIndex]) {
          // If a keyframe was active before animation, restore its pose.
          stickFigurePose = JSON.parse(JSON.stringify(keyframes[activeKeyframeIndex].pose));
      } else if (keyframes.length > 0) {
          // Otherwise, reset to the first keyframe's pose as a sensible default.
          stickFigurePose = JSON.parse(JSON.stringify(keyframes[0].pose));
      }

      redraw();
  }

  function animateLoop(timestamp: number) {
    if (!isAnimating || animationStartTime === null || keyframes.length < 2) {
        stopAnimation();
        return;
    }

    const cycleDuration = animationMode === 'ping-pong' ? animationTotalDuration * 2 : animationTotalDuration;
    const cycleTime = (timestamp - animationStartTime) % cycleDuration;

    let globalTime: number; // Normalized 0 to 1
    if (animationMode === 'ping-pong') {
        if (cycleTime > animationTotalDuration) { // Playing backwards
            globalTime = (animationTotalDuration - (cycleTime - animationTotalDuration)) / animationTotalDuration;
        } else { // Playing forwards
            globalTime = cycleTime / animationTotalDuration;
        }
    } else { // Loop
        globalTime = cycleTime / animationTotalDuration;
    }

    animationProgress = globalTime;

    let sourceFrameIndex = -1;
    for (let i = 0; i < keyframes.length - 1; i++) {
        if (globalTime >= keyframes[i].time && globalTime <= keyframes[i+1].time) {
            sourceFrameIndex = i;
            break;
        }
    }
    if (sourceFrameIndex === -1) {
        // Fallback for end of animation
        stickFigurePose = JSON.parse(JSON.stringify(keyframes[keyframes.length - 1].pose));
    } else {
        const targetFrameIndex = sourceFrameIndex + 1;
        const sourceFrame = keyframes[sourceFrameIndex];
        const targetFrame = keyframes[targetFrameIndex];

        const segmentDuration = targetFrame.time - sourceFrame.time;
        const timeIntoSegment = globalTime - sourceFrame.time;
        
        const progress = (segmentDuration === 0) ? 1 : Math.min(1, timeIntoSegment / segmentDuration);

        stickFigurePose = interpolatePose(sourceFrame.pose, targetFrame.pose, progress);
    }
    
    redraw();
    
    if (isAnimating) {
        animationRequestId = requestAnimationFrame(animateLoop);
    }
  }

  function pauseAnimation() {
    if (!isAnimating || isPaused) return;
    if (animationRequestId) cancelAnimationFrame(animationRequestId);
    animationRequestId = null;
    isPaused = true;
    if (animationStartTime) {
        timeElapsedBeforePause = performance.now() - animationStartTime;
    }
    redraw();
  }

  function resumeAnimation() {
      if (!isAnimating || !isPaused) return;
      isPaused = false;
      if (animationStartTime) {
          animationStartTime = performance.now() - timeElapsedBeforePause;
      }
      animationRequestId = requestAnimationFrame(animateLoop);
  }

  function startAnimation() {
      if (keyframes.length < 2) return;
      isAnimating = true;
      isPaused = false;
      timeElapsedBeforePause = 0;
      animationStartTime = performance.now();
      durationInput.disabled = true;
      
      activeKeyframeIndexBeforeAnimation = activeKeyframeIndex;
      activeKeyframeIndex = null; // Deselect frame during animation playback

      animationRequestId = requestAnimationFrame(animateLoop);
  }
  
  // --- Event Listeners ---
  canvas.addEventListener('mousedown', (e) => {
    const mousePos = getMousePos(canvas, e);

    if (isInside(mousePos, layout.ANIMATE_BUTTON_RECT)) {
        if (isAnimating) {
            stopAnimation();
        } else if (keyframes.length >= 2) {
            autoSaveCurrentPoseIfActive();
            startAnimation();
        }
        return;
    }

    if (isInside(mousePos, layout.PAUSE_BUTTON_RECT)) {
        if (!isAnimating) return;
        if (isPaused) {
            resumeAnimation();
        } else {
            pauseAnimation();
        }
        return;
    }

    if (isAnimating) return;

    if (isInside(mousePos, layout.MODE_BUTTON_RECT)) {
        if (keyframes.length >= 2) {
            animationMode = animationMode === 'loop' ? 'ping-pong' : 'loop';
            redraw();
        }
        return;
    }

    if (hoveredMarkerIndex !== null) {
        // Select the keyframe on click
        if (activeKeyframeIndex !== hoveredMarkerIndex) {
            autoSaveCurrentPoseIfActive();
            activeKeyframeIndex = hoveredMarkerIndex;
            stickFigurePose = JSON.parse(JSON.stringify(keyframes[hoveredMarkerIndex].pose));

            // Adjust scroll offset to make the new active thumbnail visible
            if (activeKeyframeIndex < scrollOffset) {
                scrollOffset = activeKeyframeIndex;
            } else if (activeKeyframeIndex >= scrollOffset + layout.VISIBLE_THUMBNAILS) {
                scrollOffset = activeKeyframeIndex - layout.VISIBLE_THUMBNAILS + 1;
            }
        }
        
        // Allow dragging for non-endpoint markers
        if (hoveredMarkerIndex > 0 && hoveredMarkerIndex < keyframes.length - 1) {
            draggedMarkerIndex = hoveredMarkerIndex;
        }
        
        redraw();
        return;
    }

    const horizontalGrabberRect: Rect = { x: 0, y: groundY - GUIDE_GRAB_BUFFER, width: layout.GUIDE_GRABBER_SIZE, height: GUIDE_GRAB_BUFFER * 2 };
    if (isInside(mousePos, horizontalGrabberRect) && mousePos.y < layout.POSING_AREA_HEIGHT) {
        isDraggingGround = true;
        return;
    }
    const verticalGrabberRect: Rect = { x: verticalGuideX - GUIDE_GRAB_BUFFER, y: layout.POSING_AREA_HEIGHT - layout.GUIDE_GRABBER_SIZE, width: GUIDE_GRAB_BUFFER * 2, height: layout.GUIDE_GRABBER_SIZE };
    if (isInside(mousePos, verticalGrabberRect) && mousePos.y < layout.POSING_AREA_HEIGHT) {
        isDraggingVerticalGuide = true;
        return;
    }

    if (hoveredDeleteIconIndex !== null) {
        const indexToDelete = hoveredDeleteIconIndex;
        autoSaveCurrentPoseIfActive();

        if (activeKeyframeIndex === indexToDelete) {
            activeKeyframeIndex = null;
            stickFigurePose = JSON.parse(JSON.stringify(defaultPose));
            isOnionModeEnabled = false;
        }

        keyframes.splice(indexToDelete, 1);

        if (activeKeyframeIndex !== null && activeKeyframeIndex > indexToDelete) {
            activeKeyframeIndex--;
        }

        redistributeKeyframeTimes();
        scrollOffset = Math.max(0, Math.min(scrollOffset, keyframes.length - layout.VISIBLE_THUMBNAILS));
        
        hoveredDeleteIconIndex = null;
        redraw();
        return;
    }

    if (isInside(mousePos, layout.ONION_BUTTON_RECT)) {
        if (activeKeyframeIndex !== null) {
            isOnionModeEnabled = !isOnionModeEnabled;
            redraw();
        }
        return;
    }

    if (isInside(mousePos, layout.EXPORT_BUTTON_RECT)) {
        autoSaveCurrentPoseIfActive();
        exportKeyframesAsJSON(keyframes);
        return;
    }

    if (isInside(mousePos, layout.IMPORT_BUTTON_RECT)) {
        importInput.click();
        return;
    }

    if (isInside(mousePos, layout.SCROLL_LEFT_BUTTON_RECT)) {
        scrollOffset = Math.max(0, scrollOffset - 1);
        redraw(); return;
    }
    if (isInside(mousePos, layout.SCROLL_RIGHT_BUTTON_RECT)) {
        scrollOffset = Math.min(scrollOffset + 1, Math.max(0, keyframes.length - layout.VISIBLE_THUMBNAILS));
        redraw(); return;
    }

    for (let i = 0; i < layout.THUMBNAIL_RECTS.length; i++) {
        const clickedIndex = scrollOffset + i;
        if (isInside(mousePos, layout.THUMBNAIL_RECTS[i]) && keyframes[clickedIndex]) {
            if (activeKeyframeIndex !== clickedIndex) {
                 autoSaveCurrentPoseIfActive();
                 activeKeyframeIndex = clickedIndex;
                 stickFigurePose = JSON.parse(JSON.stringify(keyframes[clickedIndex].pose));
                 redraw();
            }
            return;
        }
    }
    
    const currentPoints = calculatePointsFromPose(stickFigurePose, hierarchy, boneLengths, children);
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
    draggedPointKey = closestPoint;

    if (!draggedPointKey && mousePos.y < layout.POSING_AREA_HEIGHT) {
        autoSaveCurrentPoseIfActive();
        
        const newKeyframe: Keyframe = { pose: JSON.parse(JSON.stringify(stickFigurePose)), time: 0 };
        
        const insertIndex = activeKeyframeIndex === null ? keyframes.length : activeKeyframeIndex + 1;
        keyframes.splice(insertIndex, 0, newKeyframe);
        
        activeKeyframeIndex = insertIndex;
        
        redistributeKeyframeTimes();

        scrollOffset = Math.max(0, keyframes.length - layout.VISIBLE_THUMBNAILS);
        redraw();
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    currentMousePos = getMousePos(canvas, e);

    if (draggedMarkerIndex !== null) {
        const timelineRect = layout.TIMELINE_RECT;
        let newTime = (currentMousePos.x - timelineRect.x) / timelineRect.width;

        const prevTime = keyframes[draggedMarkerIndex - 1].time;
        const nextTime = keyframes[draggedMarkerIndex + 1].time;
        
        newTime = Math.max(prevTime, Math.min(newTime, nextTime));
        
        keyframes[draggedMarkerIndex].time = newTime;
        redraw();
        return;
    }

    if (isDraggingGround && !isAnimating) {
        groundY = Math.max(0, Math.min(currentMousePos.y, layout.POSING_AREA_HEIGHT));
        redraw();
        return;
    }
    if (isDraggingVerticalGuide && !isAnimating) {
        verticalGuideX = Math.max(0, Math.min(currentMousePos.x, canvas.width));
        redraw();
        return;
    }
    
    hoveredAnimateButton = isInside(currentMousePos, layout.ANIMATE_BUTTON_RECT);
    hoveredPauseButton = isInside(currentMousePos, layout.PAUSE_BUTTON_RECT);

    if (isAnimating) {
        hoveredModeButton = hoveredOnionButton = hoveredExportButton = hoveredImportButton = hoveredScrollLeft = hoveredScrollRight = false;
        hoveredThumbnailIndex = null;
        hoveredDeleteIconIndex = null;
        hoveredGround = hoveredVerticalGuide = hoveredMarkerIndex = null;
    } else {
        hoveredModeButton = isInside(currentMousePos, layout.MODE_BUTTON_RECT);
        hoveredOnionButton = isInside(currentMousePos, layout.ONION_BUTTON_RECT);
        hoveredExportButton = isInside(currentMousePos, layout.EXPORT_BUTTON_RECT);
        hoveredImportButton = isInside(currentMousePos, layout.IMPORT_BUTTON_RECT);
        hoveredScrollLeft = isInside(currentMousePos, layout.SCROLL_LEFT_BUTTON_RECT);
        hoveredScrollRight = isInside(currentMousePos, layout.SCROLL_RIGHT_BUTTON_RECT);
        hoveredThumbnailIndex = null;
        hoveredDeleteIconIndex = null;
        hoveredMarkerIndex = null;

        for(let i=0; i < keyframes.length; i++) {
            const markerRect = getTimelineMarkerRect(keyframes[i], layout.TIMELINE_RECT);
            if (isInside(currentMousePos, markerRect)) {
                hoveredMarkerIndex = i;
                break;
            }
        }

        hoveredGround = false;
        hoveredVerticalGuide = false;
        if (currentMousePos.y < layout.POSING_AREA_HEIGHT) {
            const horizontalGrabberRect: Rect = { x: 0, y: groundY - GUIDE_GRAB_BUFFER, width: layout.GUIDE_GRABBER_SIZE, height: GUIDE_GRAB_BUFFER * 2 };
            const verticalGrabberRect: Rect = { x: verticalGuideX - GUIDE_GRAB_BUFFER, y: layout.POSING_AREA_HEIGHT - layout.GUIDE_GRABBER_SIZE, width: GUIDE_GRAB_BUFFER * 2, height: layout.GUIDE_GRABBER_SIZE };

            if (isInside(currentMousePos, horizontalGrabberRect)) {
                hoveredGround = true;
            } else if (isInside(currentMousePos, verticalGrabberRect)) {
                hoveredVerticalGuide = true;
            }
        }

        for (let i = 0; i < layout.THUMBNAIL_RECTS.length; i++) {
            const thumbRect = layout.THUMBNAIL_RECTS[i];
            const actualIndex = scrollOffset + i;
            if (keyframes[actualIndex] && isInside(currentMousePos, thumbRect)) {
                hoveredThumbnailIndex = actualIndex; 

                const deleteRect = getDeleteButtonRect(thumbRect);
                if (isInside(currentMousePos, deleteRect)) {
                    hoveredDeleteIconIndex = actualIndex;
                    hoveredThumbnailIndex = null;
                    break; 
                }
            }
        }
    }

    if (draggedPointKey && !isAnimating) {
        const mousePos = currentMousePos;
        mousePos.y = Math.min(mousePos.y, layout.POSING_AREA_HEIGHT - 2);

        if (draggedPointKey === 'hip') {
            stickFigurePose.hip = mousePos;
        } else {
            const parentKey = hierarchy[draggedPointKey as keyof typeof hierarchy]!;
            const currentPoints = calculatePointsFromPose(stickFigurePose, hierarchy, boneLengths, children);
            const parentPos = currentPoints[parentKey as keyof StickFigurePoints];
            
            const newAngle = Math.atan2(mousePos.y - parentPos.y, mousePos.x - parentPos.x);
            stickFigurePose.angles[draggedPointKey] = newAngle;
        }
    }
    redraw();
  });

  canvas.addEventListener('mouseup', () => { 
    if (draggedMarkerIndex !== null) {
        keyframes.sort((a,b) => a.time - b.time);
        // Find the dragged keyframe again after sort to update activeKeyframeIndex if needed
        // This is complex, for now we assume clamping prevents reordering
    }
    draggedPointKey = null;
    isDraggingGround = false;
    isDraggingVerticalGuide = false;
    draggedMarkerIndex = null;
  });

  canvas.addEventListener('mouseleave', () => {
    draggedPointKey = null;
    isDraggingGround = false;
    isDraggingVerticalGuide = false;
    draggedMarkerIndex = null;
    currentMousePos = null;
    if(!isAnimating){
        hoveredModeButton = hoveredOnionButton = hoveredScrollLeft = hoveredScrollRight = hoveredExportButton = hoveredImportButton = hoveredPauseButton = false;
        hoveredThumbnailIndex = null;
        hoveredDeleteIconIndex = null;
        hoveredGround = hoveredVerticalGuide = hoveredMarkerIndex = null;
    }
    hoveredAnimateButton = false;
    redraw();
  });

  window.addEventListener('keydown', (e) => {
    if (isAnimating || (document.activeElement && document.activeElement.tagName === 'INPUT') || isDraggingGround || isDraggingVerticalGuide || draggedMarkerIndex !== null) {
        return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();

        if (keyframes.length === 0) return;

        let nextIndex: number;
        
        if (activeKeyframeIndex === null) {
            nextIndex = (e.key === 'ArrowLeft') ? keyframes.length - 1 : 0;
        } else {
            nextIndex = (e.key === 'ArrowLeft') ? activeKeyframeIndex - 1 : activeKeyframeIndex + 1;
        }
        
        if (nextIndex >= 0 && nextIndex < keyframes.length) {
            autoSaveCurrentPoseIfActive();

            activeKeyframeIndex = nextIndex;
            stickFigurePose = JSON.parse(JSON.stringify(keyframes[activeKeyframeIndex].pose));

            if (activeKeyframeIndex < scrollOffset) {
                scrollOffset = activeKeyframeIndex;
            } else if (activeKeyframeIndex >= scrollOffset + layout.VISIBLE_THUMBNAILS) {
                scrollOffset = activeKeyframeIndex - layout.VISIBLE_THUMBNAILS + 1;
            }
            redraw();
        }
    }
  });

  importInput.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
        try {
            autoSaveCurrentPoseIfActive();
            const loadedKfs = await loadKeyframesFromFile(file);
            keyframes = loadedKfs;
            activeKeyframeIndex = keyframes.length > 0 ? 0 : null;
            scrollOffset = 0;
            stickFigurePose = keyframes.length > 0 ? JSON.parse(JSON.stringify(keyframes[0].pose)) : JSON.parse(JSON.stringify(defaultPose));
            isOnionModeEnabled = false;
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
        animationTotalDuration = newDuration * 1000;
    } else {
        durationInput.value = (animationTotalDuration / 1000).toString();
        alert("Invalid duration. Please enter a positive number.");
    }
  });

  // Initial setup
  durationInput.value = (animationTotalDuration / 1000).toString();
  redraw();
}

main();