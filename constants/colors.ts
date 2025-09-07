const colors = {
  // Primary brand colors
  primary: "#00D9FF",
  primaryDark: "#0099CC",
  primaryLight: "#33E5FF",
  
  secondary: "#B24BF3",
  secondaryDark: "#8B2FC7",
  secondaryLight: "#C875F5",
  
  accent: "#FFD700",
  accentDark: "#E6C200",
  accentLight: "#FFDF33",
  
  // Background colors
  background: "#0A0E27",
  backgroundDark: "#000814",
  backgroundLight: "#1A1F3A",
  surface: "#1A1F3A",
  surfaceElevated: "#252B4A",
  
  // Text colors
  text: "#FFFFFF",
  textSecondary: "#9CA3AF",
  textMuted: "#6B7280",
  textDisabled: "#4B5563",
  
  // Status colors
  success: "#10B981",
  successLight: "#34D399",
  warning: "#F59E0B",
  warningLight: "#FBBF24",
  error: "#EF4444",
  errorLight: "#F87171",
  info: "#3B82F6",
  infoLight: "#60A5FA",
  
  // Border colors
  border: "rgba(178, 75, 243, 0.1)",
  borderLight: "rgba(178, 75, 243, 0.2)",
  borderMuted: "rgba(156, 163, 175, 0.1)",
  
  // Overlay colors
  overlay: "rgba(0, 0, 0, 0.5)",
  overlayLight: "rgba(0, 0, 0, 0.3)",
  overlayDark: "rgba(0, 0, 0, 0.7)",
  
  // Gradient colors
  gradients: {
    primary: ["#00D9FF", "#B24BF3"] as const,
    primaryReverse: ["#B24BF3", "#00D9FF"] as const,
    background: ["#0A0E27", "#000814", "#000000"] as const,
    surface: ["rgba(178, 75, 243, 0.1)", "rgba(0, 217, 255, 0.1)"] as const,
    constellation: ["#0A0E27", "#000814"] as const,
  },
  
  // Constellation specific colors
  constellation: {
    star: "#E2E8F0",
    starGlow: "#B24BF3",
    shootingStar: "#FFFFFF",
    connection: "rgba(178, 75, 243, 0.25)",
    orbGlow: "#FFFFFF",
    emptyOrb: "rgba(178, 75, 243, 0.2)",
    emptyOrbBorder: "rgba(178, 75, 243, 0.3)",
  },
  
  // Age-based colors for entries
  entryAge: {
    fresh: "#00D9FF", // 0-1 days
    recent: "#8AB6FF", // 2-7 days  
    mature: "#B24BF3", // 8-30 days
    aged: "#FFD700", // 30+ days
  },
  
  // Interactive states
  interactive: {
    pressed: "rgba(255, 255, 255, 0.1)",
    hover: "rgba(255, 255, 255, 0.05)",
    focus: "rgba(178, 75, 243, 0.3)",
    disabled: "rgba(107, 114, 128, 0.5)",
  },
};

export default colors;