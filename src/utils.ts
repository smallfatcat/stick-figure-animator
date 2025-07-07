import { Point, Rect, StickFigurePose, Keyframe } from './types';

export function getMousePos(canvas: HTMLCanvasElement, evt: MouseEvent): Point {
    const rect = canvas.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
}

export function isInside(pos: Point, rect: Rect): boolean {
    return pos.x > rect.x && pos.x < rect.x + rect.width && pos.y > rect.y && pos.y < rect.y + rect.height;
}

/**
 * Creates and triggers a download for a JSON file containing the keyframes.
 */
export function exportKeyframesAsJSON(keyframes: Keyframe[]) {
    if (keyframes.length === 0) {
        console.warn("No keyframes to export.");
        return;
    }
    const jsonString = JSON.stringify(keyframes, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stick-figure-animation.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


function ensurePoseCompatibility(pose: StickFigurePose): StickFigurePose {
    if (pose.angles && pose.angles.leftToe === undefined) {
        pose.angles.leftToe = Math.PI; // Default to horizontal pointing left
    }
    if (pose.angles && pose.angles.rightToe === undefined) {
        pose.angles.rightToe = 0; // Default to horizontal pointing right
    }
    return pose;
}

/**
 * Loads and validates keyframes from a user-provided file.
 * Returns the parsed keyframes or throws an error.
 */
export function loadKeyframesFromFile(file: File): Promise<Keyframe[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result;
                if (typeof text !== 'string') {
                    throw new Error("Failed to read file.");
                }
                const data = JSON.parse(text);

                if (!Array.isArray(data)) {
                    throw new Error("Invalid keyframe file: not an array.");
                }

                if (data.length === 0) {
                    resolve([]);
                    return;
                }

                // Check for new format (Keyframe[]) vs old format (StickFigurePose[])
                if (data[0].pose !== undefined && typeof data[0].time === 'number') {
                    // New format detected
                    const keyframes = (data as Keyframe[]).map(kf => ({
                        ...kf,
                        pose: ensurePoseCompatibility(kf.pose)
                    }));
                     // Basic validation
                    if (keyframes.some(item => typeof item.pose?.hip?.x !== 'number' || typeof item.pose?.angles !== 'object')) {
                         throw new Error("Invalid keyframe file format.");
                    }
                    resolve(keyframes);
                } else if (data[0].hip !== undefined && data[0].angles !== undefined) {
                    // Old format detected, convert it
                    const numKeyframes = data.length;
                    const keyframes = (data as StickFigurePose[]).map((pose, index) => ({
                        pose: ensurePoseCompatibility(pose),
                        time: numKeyframes <= 1 ? 0 : index / (numKeyframes - 1)
                    }));
                    resolve(keyframes);
                } else {
                    throw new Error("Unrecognized keyframe file format.");
                }

            } catch (error) {
                console.error("Error loading keyframes:", error);
                reject(error);
            }
        };
        reader.onerror = () => {
            reject(new Error("Error reading file."));
        };
        reader.readAsText(file);
    });
}