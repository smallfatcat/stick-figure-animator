import { Point, StickFigurePoints } from './types';

export function drawGuides(
    ctx: CanvasRenderingContext2D, 
    groundY: number, 
    verticalGuideX: number, 
    canvasWidth: number, 
    posingAreaHeight: number,
    grabberSize: number,
    isHoveredHorizontal: boolean,
    isHoveredVertical: boolean
) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Horizontal Guide
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvasWidth, groundY);
    ctx.stroke();

    // Vertical Guide
    ctx.beginPath();
    ctx.moveTo(verticalGuideX, 0);
    ctx.lineTo(verticalGuideX, posingAreaHeight);
    ctx.stroke();

    // Reset for grabbers
    ctx.setLineDash([]);
    ctx.lineCap = 'butt';

    // Horizontal grabber (left side)
    ctx.lineWidth = isHoveredHorizontal ? 8 : 5;
    ctx.strokeStyle = isHoveredHorizontal ? 'rgba(255, 255, 0, 1)' : 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(grabberSize, groundY);
    ctx.stroke();

    // Vertical grabber (bottom side)
    ctx.lineWidth = isHoveredVertical ? 8 : 5;
    ctx.strokeStyle = isHoveredVertical ? 'rgba(255, 255, 0, 1)' : 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.moveTo(verticalGuideX, posingAreaHeight - grabberSize);
    ctx.lineTo(verticalGuideX, posingAreaHeight);
    ctx.stroke();

    ctx.restore();
}

export function drawStickFigure(
    ctx: CanvasRenderingContext2D,
    figure: StickFigurePoints,
    options: { strokeStyle?: string; fillStyle?: string } = {}
) {
    ctx.strokeStyle = options.strokeStyle || '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    // Head
    ctx.beginPath();
    ctx.arc(figure.head.x, figure.head.y, 20, 0, Math.PI * 2);
    ctx.stroke();

    // Torso
    ctx.beginPath();
    ctx.moveTo(figure.head.x, figure.head.y + 20); // visual offset
    ctx.lineTo(figure.neck.x, figure.neck.y);
    ctx.lineTo(figure.hip.x, figure.hip.y);
    ctx.stroke();

    // Arms
    ctx.beginPath();
    ctx.moveTo(figure.neck.x, figure.neck.y);
    ctx.lineTo(figure.leftElbow.x, figure.leftElbow.y);
    ctx.lineTo(figure.leftHand.x, figure.leftHand.y);
    ctx.moveTo(figure.neck.x, figure.neck.y);
    ctx.lineTo(figure.rightElbow.x, figure.rightElbow.y);
    ctx.lineTo(figure.rightHand.x, figure.rightHand.y);
    ctx.stroke();

    // Hands
    ctx.fillStyle = options.fillStyle || '#FFFFFF';
    const handRadius = 8;
    ctx.beginPath();
    ctx.arc(figure.leftHand.x, figure.leftHand.y, handRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(figure.rightHand.x, figure.rightHand.y, handRadius, 0, Math.PI * 2);
    ctx.fill();

    // Legs & Feet
    ctx.beginPath();
    // Left Leg
    ctx.moveTo(figure.hip.x, figure.hip.y);
    ctx.lineTo(figure.leftKnee.x, figure.leftKnee.y);
    ctx.lineTo(figure.leftFoot.x, figure.leftFoot.y);
    // Right Leg
    ctx.moveTo(figure.hip.x, figure.hip.y);
    ctx.lineTo(figure.rightKnee.x, figure.rightKnee.y);
    ctx.lineTo(figure.rightFoot.x, figure.rightFoot.y);

    // Feet
    ctx.moveTo(figure.leftFoot.x, figure.leftFoot.y);
    ctx.lineTo(figure.leftToe.x, figure.leftToe.y);
    ctx.moveTo(figure.rightFoot.x, figure.rightFoot.y);
    ctx.lineTo(figure.rightToe.x, figure.rightToe.y);
    ctx.stroke();
}


export function drawGrabHandles(ctx: CanvasRenderingContext2D, figure: StickFigurePoints, radius: number, mousePos: Point | null, isIKMode: boolean = false): boolean {
  if (!mousePos) return false;

  ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
  ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
  ctx.lineWidth = 2;

  let isHoveringJoint = false;
  for (const key in figure) {
    const point = figure[key as keyof StickFigurePoints];
    const distance = Math.hypot(mousePos.x - point.x, mousePos.y - point.y);
    
    if (distance < radius) {
      // In IK mode, only show handles for end effectors
      if (isIKMode) {
        const endEffectors = ['leftHand', 'rightHand', 'leftFoot', 'rightFoot', 'leftToe', 'rightToe'];
        if (!endEffectors.includes(key)) {
          continue;
        }
        // Use different color for IK mode
        ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
      }
      
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      isHoveringJoint = true;
    }
  }
  return isHoveringJoint;
}