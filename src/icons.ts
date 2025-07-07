
/**
 * A library of SVG icons used throughout the application.
 * Using a central file for icons ensures consistency and makes them easy to manage.
 * @param path The SVG path data.
 * @param viewBox The SVG viewBox attribute.
 * @returns A string containing the full SVG element.
 */
const svg = (path: string, viewBox = '0 0 24 24') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="22" height="22" fill="currentColor">${path}</svg>`;

export const icons = {
    // Filled icons for primary actions (Play, Pause, Stop)
    play: svg('<path d="M8 5v14l11-7z"/>'),
    pause: svg('<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'),
    stop: svg('<path d="M6 6h12v12H6z"/>'),

    // Line icons for tools
    insert: svg('<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>'),
    loop: svg('<path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>'),
    pingpong: svg('<path d="M8 4l-4 4 4 4V9h8v3l4-4-4-4v3H8V4zm8 13v-3h-8V9l-4 4 4 4v-3h8v3z" />'),
    onion: svg('<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12c-2.48 0-4.5-2.02-4.5-4.5S9.52 7.5 12 7.5s4.5 2.02 4.5 4.5-2.02 4.5-4.5 4.5zm0-7C10.62 9.5 9.5 10.62 9.5 12s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5S13.38 9.5 12 9.5z"/>'),
    export: svg('<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>'),
    import: svg('<path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/>'),
    motionTrail: svg('<path d="M4 6v12h2V6H4zm5 0v12h2V6H9zm5 0v12h2V6h-2z"/>')
};