import { useMemo, type JSX } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
  type TooltipItem,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import type { DroppedFileInfo } from "../../interface/DroppedFileInfo";
import type { AttendeeRow } from "../../interface/AttendeeRow";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
);

const BUCKETS = [
  "Walk-in (At Door)",
  "Same Day",
  "1-3 Days Before",
  "4-7 Days Before",
  "1-2 Weeks Before",
  "2+ Weeks Before",
] as const;

type BucketLabel = (typeof BUCKETS)[number];

export interface LeadTimeTurnoutChartProps {
  curData: DroppedFileInfo[];
}

interface LeadTimeMemoResult {
  barData: ChartData<"bar", number[], string>;
  pieData: ChartData<"pie", number[], string>;
  totalCheckedIn: number;
  totalNoShow: number;
  checkedInPct: number;
  noShowPct: number;
}

const LeadTimeTurnoutChart = ({
  curData,
}: LeadTimeTurnoutChartProps): JSX.Element => {
  const {
    barData,
    pieData,
    totalCheckedIn,
    totalNoShow,
    checkedInPct,
    noShowPct,
  } = useMemo<LeadTimeMemoResult>((): LeadTimeMemoResult => {
    const checkedInCounts: Record<BucketLabel, number> = {
      "Walk-in (At Door)": 0,
      "Same Day": 0,
      "1-3 Days Before": 0,
      "4-7 Days Before": 0,
      "1-2 Weeks Before": 0,
      "2+ Weeks Before": 0,
    };

    const noShowCounts: Record<BucketLabel, number> = {
      "Walk-in (At Door)": 0,
      "Same Day": 0,
      "1-3 Days Before": 0,
      "4-7 Days Before": 0,
      "1-2 Weeks Before": 0,
      "2+ Weeks Before": 0,
    };

    let overallCheckedIn: number = 0;
    let overallNoShow: number = 0;

    curData.forEach((file: DroppedFileInfo): void => {
      const timestamps: number[] = [];

      file.attendees.forEach((a: AttendeeRow): void => {
        if (a.check_in_time) {
          const t: number = new Date(a.check_in_time).getTime();
          if (!isNaN(t)) timestamps.push(t);
        }
      });

      if (timestamps.length === 0) {
        file.attendees.forEach((a: AttendeeRow): void => {
          if (a.registration_time) {
            const t: number = new Date(a.registration_time).getTime();
            if (!isNaN(t)) timestamps.push(t);
          }
        });
      }

      if (timestamps.length === 0) return;

      const maxEventTime: number = Math.max(...timestamps);
      const eventDate: Date = new Date(maxEventTime);
      const eventDayStart: number = new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate(),
      ).getTime();

      file.attendees.forEach((attendee: AttendeeRow): void => {
        const hasCheckedIn: boolean = attendee.check_in_time !== null;

        if (hasCheckedIn) {
          overallCheckedIn += 1;
        } else {
          overallNoShow += 1;
        }

        if (!attendee.registration_time) return;
        const regTime: number = new Date(attendee.registration_time).getTime();
        if (isNaN(regTime)) return;

        const checkInTime: number | null = attendee.check_in_time
          ? new Date(attendee.check_in_time).getTime()
          : null;

        let bucket: BucketLabel;

        if (
          hasCheckedIn &&
          checkInTime !== null &&
          !isNaN(checkInTime) &&
          Math.abs(checkInTime - regTime) <= 10 * 60 * 1000
        ) {
          bucket = "Walk-in (At Door)";
        } else {
          const regDate: Date = new Date(regTime);
          const regDayStart: number = new Date(
            regDate.getFullYear(),
            regDate.getMonth(),
            regDate.getDate(),
          ).getTime();

          const daysDiff: number = Math.max(
            0,
            Math.round((eventDayStart - regDayStart) / (1000 * 60 * 60 * 24)),
          );

          if (daysDiff === 0) {
            bucket = "Same Day";
          } else if (daysDiff <= 3) {
            bucket = "1-3 Days Before";
          } else if (daysDiff <= 7) {
            bucket = "4-7 Days Before";
          } else if (daysDiff <= 14) {
            bucket = "1-2 Weeks Before";
          } else {
            bucket = "2+ Weeks Before";
          }
        }

        if (hasCheckedIn) {
          checkedInCounts[bucket] += 1;
        } else {
          noShowCounts[bucket] += 1;
        }
      });
    });

    const grandTotal: number = overallCheckedIn + overallNoShow;
    const greenPct: number =
      grandTotal > 0 ? Math.round((overallCheckedIn / grandTotal) * 100) : 0;
    const redPct: number = grandTotal > 0 ? 100 - greenPct : 0;

    return {
      totalCheckedIn: overallCheckedIn,
      totalNoShow: overallNoShow,
      checkedInPct: greenPct,
      noShowPct: redPct,
      barData: {
        labels: [...BUCKETS],
        datasets: [
          {
            label: "Checked In",
            data: BUCKETS.map((b: BucketLabel): number => checkedInCounts[b]),
            backgroundColor: "rgba(16, 185, 129, 0.8)",
            borderColor: "rgb(5, 150, 105)",
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: "No-Show",
            data: BUCKETS.map((b: BucketLabel): number => noShowCounts[b]),
            backgroundColor: "rgba(244, 63, 94, 0.75)",
            borderColor: "rgb(225, 29, 72)",
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      pieData: {
        labels: [`Checked In (${greenPct}%)`, `No-Show (${redPct}%)`],
        datasets: [
          {
            data: [overallCheckedIn, overallNoShow],
            backgroundColor: [
              "rgba(16, 185, 129, 0.85)",
              "rgba(244, 63, 94, 0.8)",
            ],
            borderColor: ["rgb(5, 150, 105)", "rgb(225, 29, 72)"],
            borderWidth: 1,
          },
        ],
      },
    };
  }, [curData]);

  const barOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Registration Lead-Time vs. Turnout",
        font: {
          size: 16,
          weight: "bold",
        },
      },
      tooltip: {
        callbacks: {
          afterBody: (items: TooltipItem<"bar">[]): string => {
            const idx: number | undefined = items[0]?.dataIndex;
            if (idx === undefined) return "";
            const checkedIn: number = Number(
              barData.datasets[0]?.data[idx] ?? 0,
            );
            const noShow: number = Number(barData.datasets[1]?.data[idx] ?? 0);
            const total: number = checkedIn + noShow;
            if (total === 0) return "";
            const rate: number = Math.round((checkedIn / total) * 100);
            return `Show-up Rate: ${rate}% (${checkedIn}/${total})`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: "When Attendee Registered",
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
        title: {
          display: true,
          text: "Attendees",
        },
      },
    },
  };

  const pieOptions: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
      },
      title: {
        display: true,
        text: "Overall Turnout Split",
        font: {
          size: 16,
          weight: "bold",
        },
      },
      tooltip: {
        callbacks: {
          label: (item: TooltipItem<"pie">): string => {
            const count: number = Number(item.raw ?? 0);
            const total: number = totalCheckedIn + totalNoShow;
            const pct: string =
              total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
            return `${item.label.split(" (")[0]}: ${count} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        {/* Left 2 Columns: Stacked Bar Chart */}
        <div className="lg:col-span-2 h-96">
          <Bar data={barData} options={barOptions} />
        </div>

        {/* Right Column: Pie Chart + Quick Stats */}
        <div className="flex flex-col items-center justify-between h-96 border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-6">
          <div className="w-full flex-1 min-h-0">
            <Pie data={pieData} options={pieOptions} />
          </div>

          <div className="w-full grid grid-cols-2 gap-2 mt-4 text-center">
            <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
              <p className="text-xs font-semibold text-emerald-700 uppercase">
                Checked In
              </p>
              <p className="text-lg font-bold text-emerald-600">
                {checkedInPct}%{" "}
                <span className="text-xs font-normal text-emerald-700">
                  ({totalCheckedIn})
                </span>
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded p-2">
              <p className="text-xs font-semibold text-rose-700 uppercase">
                No-Show
              </p>
              <p className="text-lg font-bold text-rose-600">
                {noShowPct}%{" "}
                <span className="text-xs font-normal text-rose-700">
                  ({totalNoShow})
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadTimeTurnoutChart;
