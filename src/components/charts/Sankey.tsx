import {
  Chart as ChartJS,
  Tooltip,
  LinearScale,
  CategoryScale,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { SankeyController, Flow } from "chartjs-chart-sankey";

ChartJS.register(Tooltip, LinearScale, CategoryScale, SankeyController, Flow);
let totalA = 100;
let totalB = 100;
let totalC = 100;

// Each link says: "flow" people went from one node to another.
const links = [
  { from: "a", to: "b", flow: totalA / 2 },
  { from: "a", to: "c", flow: totalA / 2 },
  { from: "b", to: "d", flow: totalB / 2 },
  { from: "b", to: "e", flow: totalB / 2 },
  { from: "c", to: "d", flow: (33 / totalC) * 100 },
  { from: "c", to: "e", flow: (100 / totalC) * 100 },
];

// Node name -> text shown on screen
const labels = {
  a: "Event 1 (75)",
  b: "Event 2 (50)",
  c: "Dropped (25)",
  d: "Event 3 (40)",
  e: "Dropped (35)",
};

// Node name -> left-to-right position (0 = leftmost)
const column = { a: 0, b: 1, c: 1, d: 2, e: 2 };

export default function BasicSankey() {
  return (
    <div className="w-full h-[400px]">
      <Chart
        type="sankey"
        data={{
          datasets: [
            {
              data: links,
              labels,
              column,
              colorFrom: "#3b82f6", // color where a flow starts
              colorTo: "#10b981", // color where a flow ends
              colorMode: "gradient", // "gradient" | "from" | "to"
              nodeWidth: 50, // thickness of the bars
              size: "max", // shared scale for all nodes
            } as any,
          ],
        }}
        options={{ maintainAspectRatio: false }}
      />
    </div>
  );
}
