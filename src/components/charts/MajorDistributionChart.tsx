import { useMemo, type JSX } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
  type TooltipItem,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import type { DroppedFileInfo } from "../../interface/DroppedFileInfo";
import type { AttendeeRow } from "../../interface/AttendeeRow";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const COLOR_PALETTE: { bg: string; border: string }[] = [
  { bg: "rgba(59, 130, 246, 0.85)", border: "rgb(37, 99, 235)" }, // Blue
  { bg: "rgba(16, 185, 129, 0.85)", border: "rgb(5, 150, 105)" }, // Emerald
  { bg: "rgba(245, 158, 11, 0.85)", border: "rgb(217, 119, 6)" }, // Amber
  { bg: "rgba(139, 92, 246, 0.85)", border: "rgb(124, 58, 237)" }, // Violet
  { bg: "rgba(236, 72, 153, 0.85)", border: "rgb(219, 39, 119)" }, // Pink
  { bg: "rgba(6, 182, 212, 0.85)", border: "rgb(8, 145, 178)" }, // Cyan
  { bg: "rgba(249, 115, 22, 0.85)", border: "rgb(234, 88, 12)" }, // Orange
  { bg: "rgba(99, 102, 241, 0.85)", border: "rgb(79, 70, 229)" }, // Indigo
  { bg: "rgba(20, 184, 166, 0.85)", border: "rgb(13, 148, 136)" }, // Teal
  { bg: "rgba(244, 63, 94, 0.85)", border: "rgb(225, 29, 72)" }, // Rose
  { bg: "rgba(132, 204, 22, 0.85)", border: "rgb(101, 163, 13)" }, // Lime
  { bg: "rgba(168, 85, 247, 0.85)", border: "rgb(147, 51, 234)" }, // Purple
];

const UNKNOWN_COLOR: { bg: string; border: string } = {
  bg: "rgba(148, 163, 184, 0.75)",
  border: "rgb(100, 116, 139)",
};

export interface MajorDistributionChartProps {
  curData: DroppedFileInfo[];
}

interface MajorBreakdownItem {
  major: string;
  count: number;
  percentage: number;
  bgColor: string;
  borderColor: string;
}

interface MajorMemoResult {
  barData: ChartData<"bar", number[], string>;
  breakdownList: MajorBreakdownItem[];
  totalAttended: number;
}

const MajorDistributionChart = ({
  curData,
}: MajorDistributionChartProps): JSX.Element => {
  const { barData, breakdownList, totalAttended } =
    useMemo<MajorMemoResult>((): MajorMemoResult => {
      const majorCounts: Record<string, number> = {};
      let overallAttended: number = 0;

      curData.forEach((file: DroppedFileInfo): void => {
        const hasAnyCheckIns: boolean = file.attendees.some(
          (a: AttendeeRow): boolean => a.check_in_time !== null,
        );

        file.attendees.forEach((attendee: AttendeeRow): void => {
          const wentToEvent: boolean = hasAnyCheckIns
            ? attendee.check_in_time !== null
            : true;

          if (!wentToEvent) return;

          overallAttended += 1;
          const majorLabel: string = attendee.major?.trim() || "Unknown";
          majorCounts[majorLabel] = (majorCounts[majorLabel] ?? 0) + 1;
        });
      });

      const sortedMajors: [string, number][] = Object.entries(majorCounts).sort(
        (a: [string, number], b: [string, number]): number => b[1] - a[1],
      );

      let colorIndex: number = 0;
      const list: MajorBreakdownItem[] = sortedMajors.map(
        ([major, count]: [string, number]): MajorBreakdownItem => {
          const isUnknown: boolean = major.toLowerCase() === "unknown";
          const palette: { bg: string; border: string } = isUnknown
            ? UNKNOWN_COLOR
            : COLOR_PALETTE[colorIndex++ % COLOR_PALETTE.length];

          const pct: number =
            overallAttended > 0 ? (count / overallAttended) * 100 : 0;

          return {
            major,
            count,
            percentage: pct,
            bgColor: palette.bg,
            borderColor: palette.border,
          };
        },
      );

      return {
        totalAttended: overallAttended,
        breakdownList: list,
        // Each major becomes a stacked segment inside a single 100% bar
        barData: {
          labels: ["All Attendees"],
          datasets: list.map((item: MajorBreakdownItem) => ({
            label: item.major,
            data: [Number(item.percentage.toFixed(2))],
            backgroundColor: item.bgColor,
            borderColor: item.borderColor,
            borderWidth: 1,
            barPercentage: 0.7,
            categoryPercentage: 1.0,
          })),
        },
      };
    }, [curData]);

  const barOptions: ChartOptions<"bar"> = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Cleanly listed below in ranked order
      },
      title: {
        display: true,
        text: "Event Turnout Share by Major (100%)",
        font: {
          size: 16,
          weight: "bold",
        },
      },
      tooltip: {
        callbacks: {
          label: (item: TooltipItem<"bar">): string => {
            const idx: number = item.datasetIndex;
            const entry: MajorBreakdownItem | undefined = breakdownList[idx];
            if (!entry) return "";
            return ` ${entry.major}: ${entry.percentage.toFixed(1)}% (${entry.count} attendees)`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        min: 0,
        max: 100,
        ticks: {
          callback: (value: string | number): string => `${value}%`,
        },
        title: {
          display: true,
          text: "Percentage of Attendees (%)",
        },
      },
      y: {
        stacked: true,
        display: false,
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
      {/* Top: Single 100% Stacked Bar Chart */}
      <div className="h-36">
        <Bar data={barData} options={barOptions} />
      </div>

      {/* Bottom: Ranked List by Highest Percentage / People That Went */}
      <div className="border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            Majors Ranked by Attendance
          </h4>
          <span className="text-xs font-medium text-slate-500">
            Total Checked-In: {totalAttended}
          </span>
        </div>

        <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-1">
          {breakdownList.map(
            (item: MajorBreakdownItem, index: number): JSX.Element => (
              <li
                key={item.major}
                className="py-2.5 flex items-center justify-between gap-4 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-xs font-semibold text-slate-400 text-right">
                    #{index + 1}
                  </span>
                  <span
                    className="w-3.5 h-3.5 rounded-sm shrink-0 border"
                    style={{
                      backgroundColor: item.bgColor,
                      borderColor: item.borderColor,
                    }}
                  />
                  <span className="font-medium text-slate-800 truncate">
                    {item.major}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:block w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(item.percentage, 2)}%`,
                        backgroundColor: item.borderColor,
                      }}
                    />
                  </div>
                  <span className="font-bold text-slate-700 w-10 text-right">
                    {item.count}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 w-16 text-right">
                    ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  );
};

export default MajorDistributionChart;
