// The ultron wordmark as vector outlines.
//
// These are extracted outlines, not live text. The hero canvas on app.51ultron.com
// draws the mark with
//     ctx.font = `900 ${size}px "Inter","SF Pro Display",-apple-system,...,sans-serif`
//     ctx.letterSpacing = `${Math.floor(0.02 * size)}px`
// and the page ships no Inter webfont, so what renders is whatever the machine
// falls back to. Matching that by hand was hopeless; these outlines were measured
// against the real render instead and reproduce it at 0.926 pixel overlap.
// Shipping outlines means the mark can no longer change under us.
//
// Source outlines: Liberation Sans Bold (SIL Open Font License), letter-spaced
// 0.02em to match the canvas.
//
// Coordinates run baseline-up: y = 0 is the baseline, y = -137.2 the ascender.
// Render with fill none plus a stroke to get hollow letters.

export const WORDMARK_W = 555.06;
export const WORDMARK_H = 137.15;   // ascender height
export const WORDMARK_XH = 100;    // x-height, the unit everything is scaled in
export const WORDMARK_TOP = -137.15;
export const WORDMARK_BOT = 1.85;  // the o overshoots the baseline

export const WORDMARK_PATHS: string[] = [
	"M37.71 -100.00V-43.90Q37.71 -17.56 55.45 -17.56Q64.88 -17.56 70.66 -25.65Q76.43 -33.73 76.43 -46.40V-100.00H102.40V-22.37Q102.40 -9.61 103.14 0.00H78.37Q77.26 -13.31 77.26 -19.87H76.80Q71.63 -8.50 63.63 -3.33Q55.64 1.85 44.64 1.85Q28.74 1.85 20.24 -7.90Q11.74 -17.65 11.74 -36.51V-100.00Z",
	"M132.62 0.00V-137.15H158.59V0.00Z",
	"M214.60 1.66Q203.13 1.66 196.94 -4.57Q190.75 -10.81 190.75 -23.48V-82.44H178.09V-100.00H192.04L200.18 -123.48H216.44V-100.00H235.39V-82.44H216.44V-30.50Q216.44 -23.20 219.22 -19.73Q221.99 -16.27 227.81 -16.27Q230.86 -16.27 236.50 -17.56V-1.48Q226.89 1.66 214.60 1.66Z",
	"M255.81 0.00V-76.52Q255.81 -84.75 255.58 -90.25Q255.35 -95.75 255.07 -100.00H279.84Q280.12 -98.34 280.58 -89.88Q281.04 -81.42 281.04 -78.65H281.41Q285.20 -89.19 288.16 -93.48Q291.12 -97.78 295.18 -99.86Q299.25 -101.94 305.35 -101.94Q310.34 -101.94 313.39 -100.55V-78.84Q307.11 -80.22 302.30 -80.22Q292.60 -80.22 287.19 -72.37Q281.78 -64.51 281.78 -49.08V0.00Z",
	"M428.27 -50.09Q428.27 -25.79 414.77 -11.97Q401.28 1.85 377.43 1.85Q354.05 1.85 340.74 -12.01Q327.43 -25.88 327.43 -50.09Q327.43 -74.21 340.74 -88.03Q354.05 -101.85 377.99 -101.85Q402.48 -101.85 415.37 -88.49Q428.27 -75.14 428.27 -50.09ZM401.09 -50.09Q401.09 -67.93 395.27 -75.97Q389.45 -84.01 378.36 -84.01Q354.70 -84.01 354.70 -50.09Q354.70 -33.36 360.48 -24.63Q366.25 -15.90 377.16 -15.90Q401.09 -15.90 401.09 -50.09Z",
	"M517.45 0.00V-56.10Q517.45 -82.44 499.61 -82.44Q490.18 -82.44 484.41 -74.35Q478.63 -66.27 478.63 -53.60V0.00H452.66V-77.63Q452.66 -85.67 452.43 -90.80Q452.20 -95.93 451.92 -100.00H476.69Q476.97 -98.24 477.43 -90.62Q477.89 -82.99 477.89 -80.13H478.26Q483.53 -91.59 491.48 -96.77Q499.43 -101.94 510.43 -101.94Q526.32 -101.94 534.82 -92.14Q543.33 -82.35 543.33 -63.49V0.00Z",
];
