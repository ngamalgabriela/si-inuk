import { readSessionData } from "./persistence";

export function getCurrentLksId(): string | null {
  const identity = readSessionData<Record<string, unknown>>(
    "si-inuk-lks-identitas",
    {},
  );

  return typeof identity.lks_id === "string" && identity.lks_id
    ? identity.lks_id
    : null;
}
