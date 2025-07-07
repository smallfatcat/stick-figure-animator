import { Rect, Keyframe, Kinematics, StickFigurePose } from './types';
import { drawStickFigure } from './drawing';
import { calculatePointsFromPose } from './kinematics';

// --- UI Drawing Functions ---

export function getDeleteButtonRect(thumbnailRect: Rect): Rect {
    const size = 18;
    const padding = 3;
    return {
        x: thumbnailRect.x + thumbnailRect.width - size - padding,
        y: thumbnailRect.y + padding,
        width: size,
        height: size,
    };
}

export function getTimelineMarkerRect(keyframe: Keyframe, timelineRect: Rect): Rect {
    const markerSize = 16;
    const x = timelineRect.x + keyframe.time * timelineRect.width;
    const y = timelineRect.y + timelineRect.height / 2;
    return {
        x: x - markerSize / 2,
        y: y - markerSize / 2,
        width: markerSize,
        height: markerSize,
    };
}

function drawButton(ctx: CanvasRenderingContext2D, rect: Rect, text: string, isHovered: boolean, isDisabled: boolean = false, isActive: boolean = false) {
    if (isDisabled) {
        ctx.fillStyle = '#555';
    } else if (isActive) {
        ctx.fillStyle = '#f0ad4e';
    } else {
        ctx.fillStyle = isHovered ? '#ec9b2e' : '#c78f3d';
    }
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    
    ctx.fillStyle = isDisabled ? '#999' : (isActive ? '#FFFFFF' : '#121212');
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, rect.x + rect.width / 2, rect.y + rect.height / 2);
}

function drawScrollControls(
    ctx: CanvasRenderingContext2D, 
    leftRect: Rect, rightRect: Rect,
    isHoverLeft: boolean, isHoverRight: boolean,
    isLeftDisabled: boolean, isRightDisabled: boolean,
    isGloballyDisabled: boolean = false
) {
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const leftReallyDisabled = isLeftDisabled || isGloballyDisabled;
    ctx.fillStyle = leftReallyDisabled ? '#444' : isHoverLeft ? '#888' : '#666';
    ctx.fillRect(leftRect.x, leftRect.y, leftRect.width, leftRect.height);
    ctx.fillStyle = leftReallyDisabled ? '#666' : '#FFF';
    ctx.fillText('‹', leftRect.x + leftRect.width / 2, leftRect.y + leftRect.height / 2);

    const rightReallyDisabled = isRightDisabled || isGloballyDisabled;
    ctx.fillStyle = rightReallyDisabled ? '#444' : isHoverRight ? '#888' : '#666';
    ctx.fillRect(rightRect.x, rightRect.y, rightRect.width, rightRect.height);
    ctx.fillStyle = rightReallyDisabled ? '#666' : '#FFF';
    ctx.fillText('›', rightRect.x + rightRect.width / 2, rightRect.y + rightRect.height / 2);
}

function drawThumbnails(
    ctx: CanvasRenderingContext2D,
    rects: Rect[],
    keyframes: Keyframe[],
    currentPose: StickFigurePose,
    activeIndex: number | null,
    hoverIndex: number | null,
    scrollOffset: number,
    canvasWidth: number,
    posingAreaHeight: number,
    isAnimating: boolean,
    kinematics: Kinematics,
    hoveredDeleteIconIndex: number | null
) {
    rects.forEach((rect, visibleIndex) => {
        const actualIndex = scrollOffset + visibleIndex;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        
        ctx.strokeStyle = '#555';
        if (actualIndex === activeIndex) {
            ctx.strokeStyle = '#f0ad4e';
            ctx.shadowColor = '#f0ad4e';
            ctx.shadowBlur = 10;
        } else if (actualIndex === hoverIndex && !isAnimating) {
            ctx.strokeStyle = '#777';
        }
        ctx.lineWidth = 2;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        ctx.shadowBlur = 0;

        if (keyframes[actualIndex]) {
            // If this is the active frame, draw the live pose. Otherwise, draw the saved one.
            const thumbPose = (actualIndex === activeIndex && activeIndex !== null) 
                ? currentPose
                : keyframes[actualIndex].pose;
                
            const thumbPoints = calculatePointsFromPose(thumbPose, kinematics.hierarchy, kinematics.boneLengths, kinematics.children);
            
            const thumbCtx = ctx;
            thumbCtx.save();
            thumbCtx.translate(rect.x, rect.y);
            thumbCtx.scale(rect.width / canvasWidth, rect.height / posingAreaHeight);
            drawStickFigure(thumbCtx, thumbPoints);
            thumbCtx.restore();

            // Add keyframe number to thumbnail
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(String(actualIndex + 1), rect.x + 4, rect.y + 4);

            // Draw delete button
            const deleteRect = getDeleteButtonRect(rect);
            const isDeleteHovered = actualIndex === hoveredDeleteIconIndex && !isAnimating;
            
            ctx.save();
            ctx.fillStyle = isDeleteHovered ? '#e63946' : 'rgba(200, 50, 50, 0.8)';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            
            ctx.beginPath();
            (ctx as any).roundRect(deleteRect.x, deleteRect.y, deleteRect.width, deleteRect.height, [4]);
            ctx.fill();

            // Draw 'X'
            const padding = 5;
            ctx.beginPath();
            ctx.moveTo(deleteRect.x + padding, deleteRect.y + padding);
            ctx.lineTo(deleteRect.x + deleteRect.width - padding, deleteRect.y + deleteRect.height - padding);
            ctx.moveTo(deleteRect.x + deleteRect.width - padding, deleteRect.y + padding);
            ctx.lineTo(deleteRect.x + padding, deleteRect.y + deleteRect.height - padding);
            ctx.stroke();
            ctx.restore();
        }
    });
}

function drawTimeline(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    keyframes: Keyframe[],
    activeIndex: number | null,
    hoveredIndex: number | null,
    isAnimating: boolean,
    animationProgress: number | null
) {
    // Draw timeline bar
    ctx.fillStyle = '#111';
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

    // Draw animation progress indicator
    if (isAnimating && animationProgress !== null) {
        const progressX = rect.x + animationProgress * rect.width;
        ctx.save();
        ctx.strokeStyle = '#3498db'; // A bright blue for visibility
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(progressX, rect.y - 4);
        ctx.lineTo(progressX, rect.y + rect.height + 4);
        ctx.stroke();
        ctx.restore();
    }
    
    // Draw markers
    keyframes.forEach((kf, index) => {
        const markerRect = getTimelineMarkerRect(kf, rect);
        const isHovered = index === hoveredIndex && !isAnimating;
        const isActive = index === activeIndex;
        const isDraggable = index > 0 && index < keyframes.length - 1;
        
        ctx.save();
        ctx.translate(markerRect.x + markerRect.width / 2, markerRect.y + markerRect.height / 2);
        ctx.rotate(Math.PI / 4);

        let fillStyle = '#888';
        if (!isDraggable) fillStyle = '#555';
        if (isActive) fillStyle = '#f0ad4e';
        if (isHovered && isDraggable) fillStyle = '#ec9b2e';

        ctx.fillStyle = fillStyle;
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = (isActive || isHovered) ? 2 : 1;
        
        ctx.beginPath();
        ctx.rect(-markerRect.width / 2, -markerRect.height / 2, markerRect.width, markerRect.height);
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    });
}

export function createLayout(canvasWidth: number, canvasHeight: number) {
    const UI_PANEL_HEIGHT = 180;
    const POSING_AREA_HEIGHT = canvasHeight - UI_PANEL_HEIGHT;
    const GROUND_Y_POSITION = 396;
    const centerX = canvasWidth / 2;
    const BUTTON_WIDTH = 65;
    const BUTTON_GAP = 8;
    const totalButtonWidth = (BUTTON_WIDTH * 6) + (BUTTON_GAP * 5);
    const buttonStartY = POSING_AREA_HEIGHT + 15;
    const buttonStartX = centerX - totalButtonWidth / 2;
    
    const ANIMATE_BUTTON_RECT: Rect = { x: buttonStartX, y: buttonStartY, width: BUTTON_WIDTH, height: 35 };
    const PAUSE_BUTTON_RECT: Rect = { x: ANIMATE_BUTTON_RECT.x + BUTTON_WIDTH + BUTTON_GAP, y: buttonStartY, width: BUTTON_WIDTH, height: 35 };
    const MODE_BUTTON_RECT: Rect = { x: PAUSE_BUTTON_RECT.x + BUTTON_WIDTH + BUTTON_GAP, y: buttonStartY, width: BUTTON_WIDTH, height: 35 };
    const ONION_BUTTON_RECT: Rect = { x: MODE_BUTTON_RECT.x + BUTTON_WIDTH + BUTTON_GAP, y: buttonStartY, width: BUTTON_WIDTH, height: 35 };
    const EXPORT_BUTTON_RECT: Rect = { x: ONION_BUTTON_RECT.x + BUTTON_WIDTH + BUTTON_GAP, y: buttonStartY, width: BUTTON_WIDTH, height: 35 };
    const IMPORT_BUTTON_RECT: Rect = { x: EXPORT_BUTTON_RECT.x + BUTTON_WIDTH + BUTTON_GAP, y: buttonStartY, width: BUTTON_WIDTH, height: 35 };

    const TIMELINE_Y = ANIMATE_BUTTON_RECT.y + ANIMATE_BUTTON_RECT.height + 15;
    const TIMELINE_RECT: Rect = { x: 50, y: TIMELINE_Y, width: canvasWidth - 100, height: 12 };

    const THUMBNAIL_WIDTH = 100;
    const THUMBNAIL_HEIGHT = 75;
    const THUMBNAIL_Y = TIMELINE_Y + TIMELINE_RECT.height + 15;
    const THUMBNAIL_GAP = 10;
    const VISIBLE_THUMBNAILS = 5;
    const GUIDE_GRABBER_SIZE = 40;
    const totalThumbWidth = VISIBLE_THUMBNAILS * THUMBNAIL_WIDTH + (VISIBLE_THUMBNAILS - 1) * THUMBNAIL_GAP;
    const thumbStartX = (canvasWidth - totalThumbWidth) / 2;
    const THUMBNAIL_RECTS: Rect[] = Array.from({ length: VISIBLE_THUMBNAILS }, (_, i) => ({
        x: thumbStartX + i * (THUMBNAIL_WIDTH + THUMBNAIL_GAP),
        y: THUMBNAIL_Y,
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_HEIGHT
    }));
    const SCROLL_BUTTON_WIDTH = 40;
    const SCROLL_LEFT_BUTTON_RECT: Rect = { x: thumbStartX - SCROLL_BUTTON_WIDTH - THUMBNAIL_GAP, y: THUMBNAIL_Y, width: SCROLL_BUTTON_WIDTH, height: THUMBNAIL_HEIGHT };
    const SCROLL_RIGHT_BUTTON_RECT: Rect = { x: thumbStartX + totalThumbWidth + THUMBNAIL_GAP, y: THUMBNAIL_Y, width: SCROLL_BUTTON_WIDTH, height: THUMBNAIL_HEIGHT };
    
    return {
        UI_PANEL_HEIGHT,
        POSING_AREA_HEIGHT,
        GROUND_Y_POSITION,
        ANIMATE_BUTTON_RECT,
        PAUSE_BUTTON_RECT,
        MODE_BUTTON_RECT,
        ONION_BUTTON_RECT,
        EXPORT_BUTTON_RECT,
        IMPORT_BUTTON_RECT,
        TIMELINE_RECT,
        THUMBNAIL_RECTS,
        VISIBLE_THUMBNAILS,
        SCROLL_LEFT_BUTTON_RECT,
        SCROLL_RIGHT_BUTTON_RECT,
        GUIDE_GRABBER_SIZE
    };
}

export type Layout = ReturnType<typeof createLayout>;

export function drawUI(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    layout: Layout,
    state: any, // Using any for state object for simplicity in this refactor
    kinematics: Kinematics
) {
    const UI_PANEL_Y = layout.POSING_AREA_HEIGHT;

    ctx.fillStyle = '#222';
    ctx.fillRect(0, UI_PANEL_Y, canvasWidth, canvasHeight - UI_PANEL_Y);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, UI_PANEL_Y, canvasWidth, canvasHeight - UI_PANEL_Y);

    const animateButtonText = state.isAnimating ? 'Stop' : 'Animate';
    drawButton(ctx, layout.ANIMATE_BUTTON_RECT, animateButtonText, state.hoveredAnimateButton, state.keyframes.length < 2 && !state.isAnimating);

    const pauseIsDisabled = !state.isAnimating;
    const pauseButtonText = state.isPaused ? 'Resume' : 'Pause';
    drawButton(ctx, layout.PAUSE_BUTTON_RECT, pauseButtonText, state.hoveredPauseButton, pauseIsDisabled);

    const modeIsDisabled = state.isAnimating || state.keyframes.length < 2;
    const modeButtonText = state.animationMode === 'loop' ? 'Loop' : 'PingPong';
    drawButton(ctx, layout.MODE_BUTTON_RECT, modeButtonText, state.hoveredModeButton, modeIsDisabled);

    const onionIsDisabled = state.isAnimating || state.activeKeyframeIndex === null;
    drawButton(ctx, layout.ONION_BUTTON_RECT, 'Onion', state.hoveredOnionButton, onionIsDisabled, state.isOnionModeEnabled);

    const exportIsDisabled = state.isAnimating || state.keyframes.length === 0;
    drawButton(ctx, layout.EXPORT_BUTTON_RECT, 'Export', state.hoveredExportButton, exportIsDisabled);
    
    const importIsDisabled = state.isAnimating;
    drawButton(ctx, layout.IMPORT_BUTTON_RECT, 'Import', state.hoveredImportButton, importIsDisabled);

    if (state.keyframes.length > 0) {
        drawTimeline(
            ctx,
            layout.TIMELINE_RECT,
            state.keyframes,
            state.activeKeyframeIndex,
            state.hoveredMarkerIndex,
            state.isAnimating,
            state.animationProgress
        );
    }

    drawThumbnails(
        ctx,
        layout.THUMBNAIL_RECTS,
        state.keyframes,
        state.stickFigurePose,
        state.activeKeyframeIndex,
        state.hoveredThumbnailIndex,
        state.scrollOffset,
        canvasWidth,
        layout.POSING_AREA_HEIGHT,
        state.isAnimating,
        kinematics,
        state.hoveredDeleteIconIndex
    );

    const isLeftDisabled = state.scrollOffset === 0;
    const isRightDisabled = state.scrollOffset >= state.keyframes.length - layout.VISIBLE_THUMBNAILS;
    drawScrollControls(
        ctx,
        layout.SCROLL_LEFT_BUTTON_RECT, layout.SCROLL_RIGHT_BUTTON_RECT,
        state.hoveredScrollLeft, state.hoveredScrollRight,
        isLeftDisabled, isRightDisabled,
        state.isAnimating
    );
}