// One icon family for the whole app: 24px grid, 2.4px round strokes, drawn
// here so nothing depends on emoji, which look different on every device.
// Outline icons inherit currentColor. The three "stat" icons (flame, star,
// heart) are filled and carry their own colour so they read at a glance.

const NS = 'http://www.w3.org/2000/svg';

const STROKE = 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';

const PATHS = {
  home: `<path ${STROKE} d="M4 11.2 12 4l8 7.2V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.2h-6v5.2H5.5A1.5 1.5 0 0 1 4 19z"/>`,
  trail: `<path ${STROKE} d="M6 20.5c0-3 3-3 6-3s6-1.6 6-4.5-3-3.2-6-3.2-6-1.2-6-4A3.3 3.3 0 0 1 9.3 2.5"/><circle ${STROKE} cx="6" cy="20.5" r="1.4"/><circle ${STROKE} cx="9.3" cy="5.8" r="1.4"/>`,
  practice: `<circle ${STROKE} cx="12" cy="12" r="8.5"/><circle ${STROKE} cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>`,
  rewards: `<path ${STROKE} d="M7 4h10v4.5a5 5 0 0 1-10 0z"/><path ${STROKE} d="M7 6H4.2c0 3 1 4.6 3.2 5M17 6h2.8c0 3-1 4.6-3.2 5M12 13.6V17M8.5 20.5h7M9.5 17h5"/>`,
  grownups: `<circle ${STROKE} cx="9" cy="8" r="3.2"/><path ${STROKE} d="M3.2 19.5c0-3.3 2.6-5.6 5.8-5.6s5.8 2.3 5.8 5.6"/><circle ${STROKE} cx="17.4" cy="9.4" r="2.4"/><path ${STROKE} d="M16.8 14.2c2.4-.2 4.2 1.4 4.2 4"/>`,
  settings: `<circle ${STROKE} cx="12" cy="12" r="3.2"/><path ${STROKE} d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>`,
  close: `<path ${STROKE} d="M6 6l12 12M18 6 6 18"/>`,
  back: `<path ${STROKE} d="M14.5 5.5 8 12l6.5 6.5"/>`,
  check: `<path ${STROKE} stroke-width="3.2" d="M5 12.8 10 17.5 19 7"/>`,
  cross: `<path ${STROKE} stroke-width="3.2" d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>`,
  lock: `<rect ${STROKE} x="5" y="10.5" width="14" height="10" rx="3"/><path ${STROKE} d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>`,
  play: `<path d="M8 5.2v13.6a1 1 0 0 0 1.5.86l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 8 5.2z" fill="currentColor"/>`,
  speaker: `<path d="M4 9.5v5h3.6L12.5 19V5L7.6 9.5z" fill="currentColor"/><path ${STROKE} d="M16 9a4.2 4.2 0 0 1 0 6M18.6 6.4a8 8 0 0 1 0 11.2"/>`,
  palette: `<path ${STROKE} d="M12 3.5a8.5 8.5 0 1 0 0 17c1.5 0 2-1 1.5-2.2-.6-1.4.2-2.6 1.7-2.6H17a3.5 3.5 0 0 0 3.5-3.5C20.5 7 16.8 3.5 12 3.5z"/><circle cx="8" cy="11" r="1.3" fill="currentColor"/><circle cx="11.2" cy="7.6" r="1.3" fill="currentColor"/><circle cx="15.6" cy="8.6" r="1.3" fill="currentColor"/>`,
  download: `<path ${STROKE} d="M12 4v11M7.5 10.8 12 15.3l4.5-4.5M5 20h14"/>`,
  upload: `<path ${STROKE} d="M12 15V4M7.5 8.2 12 3.7l4.5 4.5M5 20h14"/>`,
  book: `<path ${STROKE} d="M4 5.5C6 4.6 9.5 4.6 12 6.4c2.5-1.8 6-1.8 8-.9V19c-2-.9-5.5-.9-8 .9-2.5-1.8-6-1.8-8-.9z"/><path ${STROKE} d="M12 6.4V19.9"/>`,
  crown: `<path d="M3.5 8.2 8 12l4-6.2L16 12l4.5-3.8-1.6 9.3H5.1z" fill="currentColor"/><rect x="5" y="19" width="14" height="2.2" rx="1.1" fill="currentColor"/>`,
  // filled, self-coloured stat icons
  flame: `<path d="M12.2 2.2c.5 3-1.5 4.4-3 6.4-1.6 2.1-2.6 3.6-2.6 6a5.6 5.6 0 0 0 11.2 0c0-2.3-1-3.9-2.3-5.3.1 1.5-.4 2.7-1.5 3.3.5-3.9-.9-7.7-1.8-10.4z" fill="#FF7A1A"/><path d="M12 20.4a3 3 0 0 1-3-3c0-1.7 1.2-2.6 2-3.9.4 1 1.9 1.4 2.5 2.5.6 1.1.4 2.4-.5 3.4a3 3 0 0 1-1 1z" fill="#FFC635"/>`,
  star: `<path d="M12 2.8l2.7 5.7 6.2.8-4.6 4.3 1.2 6.2L12 16.7 6.5 19.8l1.2-6.2L3.1 9.3l6.2-.8z" fill="#FFC635" stroke="#D99A00" stroke-width="1.6" stroke-linejoin="round"/>`,
  heart: `<path d="M12 20.6C6.2 16.3 3.2 13 3.2 9.2A4.7 4.7 0 0 1 12 6.7a4.7 4.7 0 0 1 8.8 2.5c0 3.8-3 7.1-8.8 11.4z" fill="#FF4D6A"/><path d="M7.2 8.6A2.4 2.4 0 0 1 9.6 7" fill="none" stroke="#FFB3C0" stroke-width="1.8" stroke-linecap="round"/>`,
  highlight: `<path d="M14.5 3.8 20.2 9.5 11 18.7H5.3v-5.7z" fill="currentColor" opacity=".25"/><path ${STROKE} d="M14.5 3.8 20.2 9.5 11 18.7H5.3v-5.7zM5 21h14"/>`,
  sparkle: `<path d="M12 2.5c.7 4.6 2.2 6.8 7 7.5-4.8.7-6.3 2.9-7 7.5-.7-4.6-2.2-6.8-7-7.5 4.8-.7 6.3-2.9 7-7.5z" fill="currentColor"/>`,
};

export function icon(name, { size = 24, label = '' } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('class', `icon icon--${name}`);
  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  svg.setAttribute('focusable', 'false');
  // Paths are authored in this file only, never from learner or pack input.
  svg.innerHTML = PATHS[name] || '';
  return svg;
}
