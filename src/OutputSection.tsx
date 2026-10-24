import LeadTimeTurnoutChart from "./components/charts/LeadTimeTurnoutChart";
import RegistrationLineChart from "./components/charts/RegistrationLineChart";
import type { DroppedFileInfo } from "./interface/DroppedFileInfo";

interface OutputProps {
  curSelected: DroppedFileInfo[];
}

let OutputSection = ({ curSelected }: OutputProps) => {
  if (curSelected.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 italic p-10">
        Select one or more files on the left to view charts and data.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto bg-slate-50">
      <RegistrationLineChart curData={curSelected} />
      <LeadTimeTurnoutChart curData={curSelected} />
    </div>
  );
};

export default OutputSection;
