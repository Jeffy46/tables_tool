import { useState } from "react";
import type { DroppedFileInfo } from "./interface/DroppedFileInfo";
import InputSection from "./InputSection";
import OutputSection from "./OutputSection";

let App = () => {
  const [data, setData] = useState<DroppedFileInfo[]>([]);
  const [curSelected, setCurSelected] = useState<DroppedFileInfo[]>([]);
  console.log(curSelected);
  return (
    <main className="grid grid-cols-[2fr_6fr] min-h-dvh">
      <div className="border border-black w-full min-h-dvh p-10">
        <section className="grid grid-rows-3 grid-flow-col gap-4 h-full">
          <InputSection
            data={data}
            setData={setData}
            curSelected={curSelected}
            setCurSelected={setCurSelected}
          ></InputSection>
        </section>
      </div>
      <div className="border border-black w-full h-full">
        <OutputSection curSelected={curSelected}></OutputSection>
      </div>
    </main>
  );
};
export default App;
