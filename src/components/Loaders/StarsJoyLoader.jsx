import DrawShimmerLoader from "./DrawShimmerLoader";

// StarsJoy rasmiy loaderi: yulduz logotip gradienti (barcha 4 burchak rangi)
// bilan chiziladi va to'ladi, o'rtadagi sparkle oq porlaydi.
// StarsJoy logotipidan pipetka bilan o'lchangan ranglar:
// binafsha #9043f5, pushti/magenta #e23eae, moviy #5d9df4, indigo #6961f5
const STAR_STOPS = [
  ["0%", "#9043f5"],
  ["35%", "#e23eae"],
  ["70%", "#5d9df4"],
  ["100%", "#6961f5"],
];

const SPARKLE_STOPS = [
  ["0%", "#ffffff"],
  ["100%", "#f5f3fa"],
];

const GLOW = "rgba(122, 101, 237, 0.55)";

export default function StarsJoyLoader({ size = 120 }) {
  return (
    <DrawShimmerLoader
      size={size}
      starStops={STAR_STOPS}
      sparkleStops={SPARKLE_STOPS}
      glow={GLOW}
    />
  );
}
