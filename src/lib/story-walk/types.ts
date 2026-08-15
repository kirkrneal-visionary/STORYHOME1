/** STORY-WALK SW-7 — Story Walk compositor types. */

export const STORY_WALK_DEFAULT_LISTING_COUNT = 3;
export const STORY_WALK_MAX_LISTING_COUNT = 5;
export const STORY_WALK_IMAGES_PER_LISTING = 5;
export const STORY_WALK_WIDTH = 1920;
export const STORY_WALK_HEIGHT = 1080;
export const STORY_WALK_FPS = 30;

export type StoryWalkListingPick = {
  id: string;
  title: string;
  subtitle: string;
  priceLabel: string;
  photos: string[];
};

export type StoryWalkComposeInput = {
  agentName: string;
  marketCity: string;
  livingMarkStillUrl: string | null;
  livingMarkVideoUrl: string | null;
  listings: StoryWalkListingPick[];
};

export type StoryWalkProgress = {
  phase: "prepare" | "render" | "encode" | "done" | "error";
  /** 0–1 */
  progress: number;
  message: string;
};
