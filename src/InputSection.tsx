import FileDropZone from "./components/FileDropZone";
import InputtedFiles from "./components/InputtedFiles";
import MajorDropZone from "./components/MajorDropZone";
import type { DroppedFileInfo } from "./interface/DroppedFileInfo";

interface InputProps {
  data: DroppedFileInfo[];
  setData: React.Dispatch<React.SetStateAction<DroppedFileInfo[]>>;
  curSelected: DroppedFileInfo[];
  setCurSelected: React.Dispatch<React.SetStateAction<DroppedFileInfo[]>>;
}
let InputSection = ({
  data,
  setData,
  curSelected,
  setCurSelected,
}: InputProps) => {
  return (
    <>
      <FileDropZone data={data} setData={setData} />
      <MajorDropZone></MajorDropZone>

      <InputtedFiles
        data={data}
        setData={setData}
        curSelected={curSelected}
        setCurSelected={setCurSelected}
      />
    </>
  );
};
export default InputSection;
