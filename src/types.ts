// --- Type Definitions ---
export type Point = { x: number; y: number; };
export type Rect = { x: number; y: number; width: number; height: number; };

// The raw XY coordinates of each joint, calculated from a pose for drawing.
export type StickFigurePoints = {
  head: Point; neck: Point; hip: Point;
  leftHand: Point; leftElbow: Point;
  rightHand: Point; rightElbow: Point;
  leftFoot: Point; leftKnee: Point; leftToe: Point;
  rightFoot: Point; rightKnee: Point; rightToe: Point;
};

// The new source of truth for a pose, using angles. Much better for interpolation.
export type StickFigurePose = {
    hip: Point; // The root position of the figure
    angles: { [key: string]: number }; // Absolute angle for each joint
};

export type Keyframe = {
    pose: StickFigurePose;
    time: number; // Normalized time (0.0 to 1.0)
};

export type Kinematics = {
    hierarchy: { [key: string]: string };
    children: { [key: string]: string[] };
    boneLengths: { [key: string]: number };
};