import { Easing } from "react-native-reanimated";

/**
 * The app's one motion vocabulary. Every animated duration comes from here, so
 * a chevron, a chip and a banner share one rhythm instead of each inventing a
 * number of its own.
 *
 * The tiers are separated by what the motion is FOR, not by how long it runs:
 *
 * - `press`  an acknowledgement decaying after the finger leaves. Never on the
 *            way in: a press must register instantly, or it reads as lag.
 * - `base`   a control changing state in place - a chevron turning, a chip
 *            selecting, a colour crossing.
 * - `enter`  something arriving on, or leaving, the screen.
 * - `reveal` a figure drawing itself: donut arcs, a bar growing to its share.
 *            The ceiling, and deliberately the narrowest tier. Nothing a user
 *            is waiting to touch belongs here.
 *
 * A convention rather than a helper, because it is applied by choosing the tier
 * below rather than by computing one: an exit runs at roughly 70% of its
 * entrance, so it gets out of the way faster than it arrived. `enter` out is
 * `base`; `reveal` out is `enter`.
 */
export const Duration = {
  press: 120,
  base: 200,
  enter: 280,
  reveal: 400,
};

/**
 * Entering decelerates, leaving accelerates, and something changing in place
 * does both. Linear is deliberately absent: it is the one curve that reads as
 * mechanical rather than physical.
 *
 * These are Reanimated easings, so they belong to `withTiming` and nothing
 * else. That is also why this file must stay out of the view-models - it is the
 * first thing in `constants/` that cannot be imported into a node test.
 */
export const Ease = {
  enter: Easing.out(Easing.cubic),
  exit: Easing.in(Easing.cubic),
  standard: Easing.inOut(Easing.cubic),
};
