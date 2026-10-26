import { useEffect, type Dispatch, type SetStateAction, type JSX } from "react";
import { useDropzone } from "react-dropzone";
import Papa, { type ParseResult } from "papaparse";
import {
  HEADER_MAP,
  RSVP_HEADER,
  type AttendeeRow,
} from "../interface/AttendeeRow";
import type { DroppedFileInfo } from "../interface/DroppedFileInfo";
import {
  getMajorByEmail,
  normalizeEmail,
  normalizeMajor,
  subscribeToMajorUpdates,
} from "../utils/majorStore";

export interface FileDropZoneProps {
  data: DroppedFileInfo[];
  setData: Dispatch<SetStateAction<DroppedFileInfo[]>>;
}

const parseDate = (val?: string): Date | null => {
  if (!val?.trim()) return null;
  const cleanStr: string = val.replace(/\s+/g, " ").trim();
  if (!cleanStr) return null;
  const d: Date = new Date(cleanStr);
  return isNaN(d.getTime()) ? null : d;
};

const FileDropZone = ({
  data: _data,
  setData,
}: FileDropZoneProps): JSX.Element => {
  useEffect(() => {
    const unsubscribe = subscribeToMajorUpdates(() => {
      setData((oldData: DroppedFileInfo[]): DroppedFileInfo[] =>
        oldData.map((fileInfo: DroppedFileInfo) => ({
          ...fileInfo,
          attendees: fileInfo.attendees.map((attendee: AttendeeRow) => {
            const mappedMajor = getMajorByEmail(attendee.email);
            return {
              ...attendee,
              major:
                mappedMajor ||
                (attendee.major !== "Unknown"
                  ? normalizeMajor(attendee.major)
                  : "Unknown"),
            };
          }),
        })),
      );
    });

    return unsubscribe;
  }, [setData]);

  const {
    getRootProps,
    getInputProps,
    isDragGlobal,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    accept: { "text/csv": [".csv"] },
    onDrop: (acceptedFiles: File[]): void => {
      if (acceptedFiles.length === 0) return;

      acceptedFiles.forEach((file: File): void => {
        Papa.parse<Record<string, string>>(file, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string): string => header.trim(),
          complete: (results: ParseResult<Record<string, string>>): void => {
            const attendees: AttendeeRow[] = results.data
              .filter(
                (row: Record<string, string>): boolean =>
                  row[RSVP_HEADER]?.trim().toLowerCase() === "yes",
              )
              .map((row: Record<string, string>): AttendeeRow => {
                const cleanEmail =
                  normalizeEmail(row[HEADER_MAP.email]) || "Unknown";
                const rawCsvMajor = row[HEADER_MAP.major]?.trim();

                return {
                  first_name: row[HEADER_MAP.first_name]?.trim() || "Unknown",
                  last_name: row[HEADER_MAP.last_name]?.trim() || "Unknown",
                  email: cleanEmail,
                  account_type: row[HEADER_MAP.account_type]?.trim() || "Guest",
                  major:
                    getMajorByEmail(cleanEmail) ||
                    (rawCsvMajor ? normalizeMajor(rawCsvMajor) : "Unknown"),
                  registration_time: parseDate(
                    row[HEADER_MAP.registration_time],
                  ),
                  check_in_time: parseDate(row[HEADER_MAP.check_in_time]),
                };
              });

            const curFile: DroppedFileInfo = {
              name: file.name,
              attendees: attendees,
              rowCount: attendees.length,
            };

            setData((oldData: DroppedFileInfo[]): DroppedFileInfo[] => {
              const alreadyExists: boolean = oldData.some(
                (item: DroppedFileInfo): boolean =>
                  item.name.toLowerCase() === curFile.name.toLowerCase(),
              );
              return alreadyExists ? oldData : [...oldData, curFile];
            });
          },
        });
      });
    },
  });

  return (
    <div className="h-full">
      <div
        {...getRootProps()}
        className="flex-1 min-h-0 flex items-center justify-center p-8 border-2 border-dashed rounded cursor-pointer h-full"
      >
        <input {...getInputProps()} />

        {isDragAccept && (
          <p className="text-green-600 font-medium">✅ Release to parse CSV</p>
        )}
        {isDragReject && (
          <p className="text-red-600 font-medium">
            ❌ Only .csv files are allowed
          </p>
        )}
        {isDragGlobal && !isDragActive && (
          <p className="text-blue-600 font-medium">
            🌐 File detected! Bring it over here...
          </p>
        )}
        {!isDragGlobal && !isDragActive && (
          <p className="text-slate-600 text-center">
            Drag &amp; drop a SBEngaged CSV file here, or click to select
          </p>
        )}
      </div>
    </div>
  );
};

export default FileDropZone;
