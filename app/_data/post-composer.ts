export const wholeRoomLabel = "Toda la sala";

export const descriptionLimits = { min: 10, max: 600 } as const;

export const photoRules = {
  max: 4,
  accept: "image/jpeg,image/png,image/webp",
  allowedTypes: ["image/jpeg", "image/png", "image/webp"] as readonly string[],
  maxBytes: 5 * 1024 * 1024,
  maxDimension: 2048,
  outputType: "image/webp",
  quality: 0.85,
  signedUrlTtl: 3600,
} as const;

export const postPhotoBucket = "post-photos";

export function audienceChipId(childId: string): string {
  return `post-audience-${childId}`;
}
