import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { DroppedFileInfo } from "../../interface/DroppedFileInfo";

// Register Chart.js modules for a Line chart
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

// Helper to safely extract local YYYY-MM-DD from either a Date object or string
const toLocalDateString = (val: Date | string): string => {
  const dateObj = val instanceof Date ? val : new Date(val);
  if (isNaN(dateObj.getTime())) {
    return String(val).split("T")[0];
  }
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

interface RegistrationLineChartProps {
  curData: DroppedFileInfo[];
}

const RegistrationLineChart = ({ curData }: RegistrationLineChartProps) => {
  // Flatten all attendees from the selected files
  const allAttendees = useMemo(() => {
    return curData.flatMap((file) => file.attendees);
  }, [curData]);

  // Aggregate only registration_time by local Date (YYYY-MM-DD)
  const chartData = useMemo(() => {
    const regCounts: Record<string, number> = {};

    allAttendees.forEach((attendee) => {
      if (attendee.registration_time) {
        const regDate = toLocalDateString(attendee.registration_time);
        regCounts[regDate] = (regCounts[regDate] || 0) + 1;
      }
    });

    const sortedDates = Object.keys(regCounts).sort();

    return {
      labels: sortedDates,
      datasets: [
        {
          label: "Registrations",
          data: sortedDates.map((date) => regCounts[date]),
          borderColor: "rgb(37, 99, 235)",
          backgroundColor: "rgba(59, 130, 246, 0.15)",
          pointBackgroundColor: "rgb(37, 99, 235)",
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
          tension: 0.3, // Slight curve; set to 0 for straight lines
          fill: true,
        },
      ],
    };
  }, [allAttendees]);

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Daily Registrations Over Time",
        font: {
          size: 16,
          weight: "bold",
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Date",
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
        title: {
          display: true,
          text: "Number of Registrations",
        },
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-96">
      <Line data={chartData} options={chartOptions} />
    </div>
  );
};

export default RegistrationLineChart;
