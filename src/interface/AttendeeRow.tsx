export interface AttendeeRow {
  first_name: string;
  last_name: string;
  email: string;
  account_type: string;
  major: string;
  registration_time: Date | null;
  check_in_time: Date | null;
}
export const RSVP_HEADER: string = "RSVP'ed";
// In types.ts
export const HEADER_MAP = {
  first_name: "First Name",
  last_name: "Last Name",
  email: "Email",
  account_type: "Account Type",
  major: "Degree",
  registration_time: "Registration Date",
  check_in_time: "Checked-In Date",
} as const;
