import type { AttendeeRow } from "./AttendeeRow";

export interface DroppedFileInfo {
  name: string;
  attendees: AttendeeRow[];
  rowCount: number;
}
