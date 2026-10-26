import { useState, useEffect, type JSX } from "react";
import { useDropzone } from "react-dropzone";
import Papa, { type ParseResult } from "papaparse";
import {
  majorHashMap,
  normalizeEmail,
  normalizeMajor,
  notifyMajorUpdates,
  subscribeToMajorUpdates,
} from "../utils/majorStore";

const MajorDropZone = (): JSX.Element => {
  const [dbSize, setDbSize] = useState<number>(majorHashMap.size);

  useEffect(() => {
    return subscribeToMajorUpdates(() => setDbSize(majorHashMap.size));
  }, []);

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
            const headers: string[] =
              results.meta.fields ?? Object.keys(results.data[0] ?? {});

            const majorCol = headers.find((h) =>
              h.toLowerCase().includes("major"),
            );
            const emailCol =
              headers.find(
                (h) =>
                  h.toLowerCase().includes("sbu") &&
                  h.toLowerCase().includes("email"),
              ) ?? headers.find((h) => h.toLowerCase().includes("email"));

            if (!majorCol || !emailCol) {
              console.error(
                `Could not find Email or Major columns in ${file.name}. Found:`,
                headers,
              );
              return;
            }

            results.data.forEach((row: Record<string, string>): void => {
              const cleanEmail = normalizeEmail(row[emailCol]);
              const cleanMajor = normalizeMajor(row[majorCol]);

              if (cleanEmail && cleanMajor !== "Unknown") {
                majorHashMap.set(cleanEmail, cleanMajor);
              }
            });

            // Saves to localStorage AND triggers FileDropZone to update existing attendees!
            notifyMajorUpdates();
          },
        });
      });
    },
  });

  return (
    <div className="h-full">
      <div
        {...getRootProps()}
        className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 border-2 border-dashed rounded cursor-pointer h-full"
      >
        <input {...getInputProps()} />

        {isDragAccept && (
          <p className="text-green-600 font-medium">
            ✅ Release to add Majors to Hashmap DB
          </p>
        )}
        {isDragReject && (
          <p className="text-red-600 font-medium">
            ❌ Only .csv files are allowed
          </p>
        )}
        {isDragGlobal && !isDragActive && (
          <p className="text-blue-600 font-medium">
            🌐 Drop Majors CSV here...
          </p>
        )}
        {!isDragGlobal && !isDragActive && (
          <div className="text-center">
            <p className="text-slate-600">
              Drag &amp; drop a CSV containing SBU Email &amp; Majors
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Currently storing {dbSize} SBU student majors
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MajorDropZone;
