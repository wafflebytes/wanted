/**
 * The Tailwind utilities mapcn's markup uses, written out once against Wanted's tokens and
 * scoped to `.wanted-map` (the app has no Tailwind). Popovers and controls are dark glass,
 * text is Archivo, focus rings are stage purple.
 */
const glass = 'background: rgba(28,28,32,0.72); -webkit-backdrop-filter: blur(18px) saturate(1.6); backdrop-filter: blur(18px) saturate(1.6);';

export const MAP_CSS = `
.wanted-map { --fg: #fff; --muted: rgba(235,235,245,0.6); --line: rgba(255,255,255,0.12); font-family: "Archivo-Medium", system-ui, sans-serif; color: var(--fg); }
.wanted-map .relative { position: relative } .wanted-map .absolute { position: absolute }
.wanted-map .inset-0 { inset: 0 } .wanted-map .z-10 { z-index: 10 }
.wanted-map .top-1 { top: 4px } .wanted-map .top-2 { top: 8px } .wanted-map .right-1 { right: 4px } .wanted-map .right-2 { right: 8px }
.wanted-map .left-2 { left: 8px } .wanted-map .bottom-2 { bottom: 8px } .wanted-map .bottom-10 { bottom: 40px }
.wanted-map .left-1\\/2 { left: 50% } .wanted-map .-translate-x-1\\/2 { transform: translateX(-50%) }
.wanted-map .bottom-full { bottom: 100% } .wanted-map .top-full { top: 100% } .wanted-map .mb-1 { margin-bottom: 4px } .wanted-map .mt-1 { margin-top: 4px }
.wanted-map .flex { display: flex } .wanted-map .inline-flex { display: inline-flex } .wanted-map .flex-col { flex-direction: column }
.wanted-map .items-center { align-items: center } .wanted-map .justify-center { justify-content: center }
.wanted-map .gap-1 { gap: 4px } .wanted-map .gap-1\\.5 { gap: 6px }
.wanted-map .h-full { height: 100% } .wanted-map .w-full { width: 100% } .wanted-map .h-4 { height: 16px } .wanted-map .w-4 { width: 16px }
.wanted-map .size-1\\.5 { width: 6px; height: 6px } .wanted-map .size-3\\.5 { width: 14px; height: 14px } .wanted-map .size-4 { width: 16px; height: 16px }
.wanted-map .size-5 { width: 20px; height: 20px } .wanted-map .size-8 { width: 44px; height: 44px }
.wanted-map .max-w-62 { max-width: 248px } .wanted-map .p-3 { padding: 12px } .wanted-map .px-2 { padding-left: 8px; padding-right: 8px } .wanted-map .py-1 { padding-top: 4px; padding-bottom: 4px }
.wanted-map .overflow-hidden { overflow: hidden } .wanted-map .pointer-events-none { pointer-events: none } .wanted-map .cursor-pointer { cursor: pointer }
.wanted-map .whitespace-nowrap { white-space: nowrap } .wanted-map .text-balance { text-wrap: balance }
.wanted-map .text-xs { font-size: 13px; line-height: 18px } .wanted-map .text-\\[10px\\] { font-size: 11px } .wanted-map .font-medium { font-weight: 500 }
.wanted-map .rounded-sm { border-radius: 6px } .wanted-map .rounded-md { border-radius: 14px } .wanted-map .rounded-full { border-radius: 999px }
.wanted-map .border { border: 1px solid var(--line) } .wanted-map .border-2 { border-width: 2px; border-style: solid } .wanted-map .border-border { border-color: var(--line) } .wanted-map .border-white { border-color: #fff }
.wanted-map .shadow-sm, .wanted-map .shadow-md, .wanted-map .shadow-lg { box-shadow: 0 8px 24px rgba(0,0,0,0.45) }
.wanted-map .bg-background, .wanted-map .bg-popover { ${glass} }
.wanted-map .bg-background\\/50 { background: rgba(0,0,0,0.35) } .wanted-map .backdrop-blur-xs { backdrop-filter: blur(2px) }
.wanted-map .bg-foreground { background: #fff } .wanted-map .text-background { color: #000 }
.wanted-map .bg-blue-500 { background: #1F8AFF } .wanted-map .bg-muted-foreground\\/60 { background: rgba(235,235,245,0.6) }
.wanted-map .text-foreground, .wanted-map .text-popover-foreground { color: var(--fg) }
.wanted-map .fill-red-500 { fill: #FF4D2E } .wanted-map .fill-red-300 { fill: #FFB000 } .wanted-map .fill-muted-foreground\\/60 { fill: rgba(235,235,245,.6) } .wanted-map .fill-muted-foreground\\/30 { fill: rgba(235,235,245,.3) }
.wanted-map .\\[\\&\\>button\\:not\\(\\:last-child\\)\\]\\:border-b > button:not(:last-child) { border-bottom: 1px solid var(--line) }
.wanted-map button { color: #fff; background: transparent; border: 0 }
.wanted-map .hover\\:bg-accent:hover, .wanted-map .hover\\:bg-muted:hover { background: rgba(255,255,255,0.1) }
.wanted-map .focus-visible\\:ring-2:focus-visible { outline: 2px solid #B45CF0; outline-offset: -2px }
.wanted-map .disabled\\:opacity-50:disabled { opacity: .5 }
.wanted-map .animate-pulse { animation: wm-pulse 1.2s ease-in-out infinite } .wanted-map .\\[animation-delay\\:150ms\\] { animation-delay: 150ms } .wanted-map .\\[animation-delay\\:300ms\\] { animation-delay: 300ms }
.wanted-map .animate-spin { animation: wm-spin .8s linear infinite }
.wanted-map .animate-in { animation: wm-in .2s ease-out }
@keyframes wm-pulse { 50% { opacity: .35 } } @keyframes wm-spin { to { transform: rotate(360deg) } } @keyframes wm-in { from { opacity: 0; transform: scale(.95) } }
.wanted-map .maplibregl-popup-content { background: transparent !important; box-shadow: none !important; padding: 0 !important; border-radius: 0 !important }
.wanted-map .maplibregl-popup-tip { display: none !important }
.wanted-map .maplibregl-ctrl-attrib { ${glass} color: var(--muted) !important; border-radius: 10px !important; font: 11px system-ui !important; border: 1px solid var(--line) }
.wanted-map .maplibregl-ctrl-attrib a { color: var(--muted) !important }
.wanted-map .maplibregl-ctrl-attrib-button { filter: invert(1) }
`;
