import FileDropZone from "./components/FileDropZone";
import InputtedFiles from "./components/InputtedFiles";
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
