import React, { useState } from "react";
import type { DroppedFileInfo } from "../interface/DroppedFileInfo";

const InputtedFiles = ({
  data,
  setData,
  curSelected,
  setCurSelected,
}: {
  data: DroppedFileInfo[];
  setData: React.Dispatch<React.SetStateAction<DroppedFileInfo[]>>;
  curSelected: DroppedFileInfo[];
  setCurSelected: React.Dispatch<React.SetStateAction<DroppedFileInfo[]>>;
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempName, setTempName] = useState("");

  const handleSelect = (file: DroppedFileInfo) => {
    setCurSelected((prev) =>
      prev.some((f) => f.name === file.name)
        ? prev.filter((f) => f.name !== file.name)
        : [...prev, file],
    );
  };

  const startEdit = (
    e: React.MouseEvent,
    index: number,
    currentName: string,
  ) => {
    e.stopPropagation();
    setEditingIndex(index);
    setTempName(currentName);
  };

  const saveEdit = (
    e: React.MouseEvent | React.KeyboardEvent,
    oldName: string,
  ) => {
    e.stopPropagation();
    const trimmed = tempName.trim();

    if (trimmed && trimmed !== oldName) {
      const rename = (list: DroppedFileInfo[]) =>
        list.map((f) => (f.name === oldName ? { ...f, name: trimmed } : f));

      setData(rename);
      setCurSelected(rename);
    }
    setEditingIndex(null);
  };

  const handleDelete = (e: React.MouseEvent, fileName: string) => {
    e.stopPropagation(); // Prevents selecting the row when clicking delete
    const remove = (list: DroppedFileInfo[]) =>
      list.filter((f) => f.name !== fileName);

    setData(remove);
    setCurSelected(remove);
    setEditingIndex(null);
  };

  return (
    <div className="h-full border border-slate-200 rounded p-3 overflow-y-auto bg-slate-50">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        Uploaded Files ({data.length})
      </p>

      {data.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No files dropped yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {data.map((file, idx) => {
            const isSelected = curSelected.some((f) => f.name === file.name);
            const isEditing = editingIndex === idx;

            return (
              <li
                key={idx}
                onClick={() => !isEditing && handleSelect(file)}
                className={`text-sm px-3 py-1.5 rounded border flex justify-between items-center gap-2 cursor-pointer ${
                  isSelected
                    ? "bg-blue-100 border-blue-500 text-blue-900"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {isEditing ? (
                  <input
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) =>
                      e.key === "Enter" && saveEdit(e, file.name)
                    }
                    autoFocus
                    className="flex-1 min-w-0 bg-white border border-blue-400 rounded px-1 text-slate-800 outline-none"
                  />
                ) : (
                  <span className="truncate flex-1 min-w-0" title={file.name}>
                    {file.name}
                  </span>
                )}

                <span className="text-xs text-slate-400 shrink-0">
                  {file.rowCount} rows
                </span>

                {isEditing ? (
                  <button
                    type="button"
                    onClick={(e) => saveEdit(e, file.name)}
                    className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    ✓
                  </button>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => startEdit(e, idx, file.name)}
                      className="px-1.5 py-0.5 text-xs border border-slate-300 rounded bg-white hover:bg-slate-200"
                      title="Rename file"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, file.name)}
                      className="px-1.5 py-0.5 text-xs border border-slate-300 rounded bg-white hover:bg-red-100 hover:border-red-300"
                      title="Delete file"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default InputtedFiles;
