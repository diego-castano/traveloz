export const springs = {
  snappy: { type: "spring" as const, stiffness: 500, damping: 30, mass: 0.8 },
  gentle: { type: "spring" as const, stiffness: 260, damping: 25, mass: 1 },
  bouncy: { type: "spring" as const, stiffness: 400, damping: 20, mass: 0.8 },
  slow: { type: "spring" as const, stiffness: 150, damping: 25, mass: 1.2 },
  micro: { type: "spring" as const, stiffness: 600, damping: 35, mass: 0.5 },
} as const;

export const stagger = {
  container: {
    variants: {
      hidden: {},
      show: {
        transition: {
          staggerChildren: 0.04,
          delayChildren: 0.08,
        },
      },
    },
  },
  item: {
    variants: {
      hidden: { opacity: 0, y: 8 },
      show: { opacity: 1, y: 0 },
    },
  },
} as const;

export const interactions = {
  buttonPress: {
    whileTap: { scale: 0.96 },
    whileHover: { scale: 1.01, y: -1 },
    transition: springs.snappy,
  },
  cardHover: {
    whileHover: { y: -5, scale: 1.01 },
    whileTap: { scale: 0.995, y: 0 },
    transition: springs.gentle,
  },
  modalContent: {
    initial: { opacity: 0, scale: 0.88, y: 30, filter: "blur(8px)" },
    animate: { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, scale: 0.95, y: -10, filter: "blur(4px)" },
    transition: springs.gentle,
  },
  toastSlide: {
    initial: { opacity: 0, x: 80, scale: 0.9, filter: "blur(4px)" },
    animate: { opacity: 1, x: 0, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, x: 80, scale: 0.9 },
    transition: springs.bouncy,
  },
  dropdownOpen: {
    initial: { opacity: 0, scale: 0.92, y: -8, filter: "blur(4px)" },
    animate: { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, scale: 0.95, y: -4, filter: "blur(2px)" },
    transition: springs.snappy,
  },
  checkboxCheck: {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: springs.bouncy,
  },
  pageTransition: {
    initial: { opacity: 0, y: 12, filter: "blur(4px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -8 },
  },
  deleteShake: {
    animate: { x: [0, -4, 4, -2, 2, 0] },
    transition: { duration: 0.4, delay: 0.3 },
  },
} as const;
