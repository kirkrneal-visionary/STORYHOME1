/** Story Home design system tokens — keep in sync with src/app/globals.css */
export { UI_FONT_STACK, TYPE_ROLES, SPACE } from "@/lib/typography";

/**
 * Live CSS (`src/app/globals.css` :root) is visual authority.
 * Values here are the JS representation of those CSS variables.
 * Do not invent a second palette.
 */
export const colors = {
  navy: "#17335e",
  gold: "#f5b71e",
  teal: "#123f38",
  paper: "#f7f4ec",
  ink: "#f4f1e8",
  hairline: "rgba(247, 244, 236, 0.11)",
} as const;
