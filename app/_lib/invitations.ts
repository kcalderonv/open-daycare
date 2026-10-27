import { randomInt } from "node:crypto";

/**
 * Sin 0/O/1/I/L: el código se dicta por teléfono y se tipea a mano.
 * 31^5 ≈ 28.6M combinaciones.
 */
export const INVITATION_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const INVITATION_CODE_LENGTH = 5;
export const INVITATION_TTL_DAYS = 7;

export type InvitationStatus =
  | "pending"
  | "expired"
  | "accepted"
  | "cancelled"
  | "not_found";

export type InvitationPreview = {
  status: InvitationStatus;
  parentFullName: string;
  childFirstName: string;
  childFullName: string;
  roomName: string;
  email: string;
};

export function normalizeInvitationCode(value: string): string {
  return value.trim().toUpperCase();
}

export function generateInvitationCode(): string {
  let code = "";

  for (let index = 0; index < INVITATION_CODE_LENGTH; index += 1) {
    code += INVITATION_CODE_ALPHABET[randomInt(INVITATION_CODE_ALPHABET.length)];
  }

  return code;
}
