import { Point, Rect, StickFigurePose, Keyframe } from './types';

export function getMousePos(canvas: HTMLCanvasElement, evt: MouseEvent): Point {
    const rect = canvas.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
}

export function isInside(pos: Point, rect: Rect): boolean {
    return pos.x > rect.x && pos.x < rect.x + rect.width && pos.y > rect.y && pos.y < rect.y + rect.height;
}

/**
 * Creates and triggers a download for a JSON file containing the keyframes with version metadata.
 */
export function exportKeyframesAsJSON(keyframes: Keyframe[]) {
    if (keyframes.length === 0) {
        console.warn("No keyframes to export.");
        return;
    }
    
    const exportData = {
        version: "1.1.0",
        format: "stick-figure-animation",
        exportedAt: new Date().toISOString(),
        keyframes: keyframes,
        metadata: {
            totalKeyframes: keyframes.length,
            duration: keyframes.length > 1 ? keyframes[keyframes.length - 1].time - keyframes[0].time : 0,
            hasIKSupport: true
        }
    };
    
    const jsonString = JSON.stringify(exportData, null, 2);
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
    // Handle conversion from older versions that only had 'neck' to new 'neckBase' + 'neck' structure
    if (pose.angles.neck !== undefined && pose.angles.neckBase === undefined) {
        // Convert old neck angle to neckBase and set neck to default
        pose.angles.neckBase = pose.angles.neck;
        pose.angles.neck = - Math.PI / 2; // Default neck angle pointing straight up
    }
    
    // Ensure all required angles exist with sensible defaults
    const requiredAngles = {
        // New neck structure (v1.1.0+)
        neckBase: Math.PI / 2, // Pointing straight up
        neck: Math.PI / 2,     // Pointing straight up
        head: Math.PI / 2,     // Pointing straight up
        
        // Arms
        leftElbow: -Math.PI / 4,  // Slight bend
        rightElbow: Math.PI / 4,  // Slight bend
        leftHand: -Math.PI / 6,   // Slight bend
        rightHand: Math.PI / 6,   // Slight bend
        
        // Legs
        leftKnee: Math.PI / 6,    // Slight bend
        rightKnee: Math.PI / 6,   // Slight bend
        leftFoot: 0,              // Horizontal
        rightFoot: 0,             // Horizontal
        leftToe: Math.PI,         // Pointing left
        rightToe: 0               // Pointing right
    };
    
    // Add missing angles with defaults
    for (const [angleName, defaultValue] of Object.entries(requiredAngles)) {
        if (pose.angles[angleName] === undefined) {
            pose.angles[angleName] = defaultValue;
        }
    }
    
    return pose;
}

/**
 * Loads and validates keyframes from a user-provided file.
 * Supports versioned format and maintains backwards compatibility.
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

                let keyframes: Keyframe[] = [];

                // Check if this is a versioned format (new format)
                if (data.version && data.format === "stick-figure-animation" && data.keyframes) {
                    console.log(`Loading animation file version ${data.version}`);
                    
                    // Handle version-specific compatibility
                    const version = data.version;
                    if (version === "1.0.0" || version === "0.0.0") {
                        console.log("Converting from v1.0.0 to v1.1.0 format (adding neckBase joint)");
                    }
                    
                    if (Array.isArray(data.keyframes)) {
                        keyframes = (data.keyframes as Keyframe[]).map(kf => ({
                            ...kf,
                            pose: ensurePoseCompatibility(kf.pose)
                        }));
                    } else {
                        throw new Error("Invalid versioned keyframe file: keyframes array missing.");
                    }
                } else if (Array.isArray(data)) {
                    // Legacy format detection
                    if (data.length === 0) {
                        resolve([]);
                        return;
                    }

                    // Check for new format (Keyframe[]) vs old format (StickFigurePose[])
                    if (data[0].pose !== undefined && typeof data[0].time === 'number') {
                        // New format detected (array of Keyframes)
                        console.log("Loading legacy new format (array of Keyframes)");
                        keyframes = (data as Keyframe[]).map(kf => ({
                            ...kf,
                            pose: ensurePoseCompatibility(kf.pose)
                        }));
                    } else if (data[0].hip !== undefined && data[0].angles !== undefined) {
                        // Old format detected (array of StickFigurePose)
                        console.log("Loading legacy old format (array of StickFigurePose)");
                        const numKeyframes = data.length;
                        keyframes = (data as StickFigurePose[]).map((pose, index) => ({
                            pose: ensurePoseCompatibility(pose),
                            time: numKeyframes <= 1 ? 0 : index / (numKeyframes - 1)
                        }));
                    } else {
                        throw new Error("Unrecognized keyframe file format.");
                    }
                } else {
                    throw new Error("Invalid keyframe file: not a valid format.");
                }

                // Basic validation
                if (keyframes.some(item => typeof item.pose?.hip?.x !== 'number' || typeof item.pose?.angles !== 'object')) {
                    throw new Error("Invalid keyframe file format.");
                }

                resolve(keyframes);

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