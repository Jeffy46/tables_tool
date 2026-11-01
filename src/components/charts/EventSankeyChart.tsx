import React, { useMemo, useState, type JSX } from "react";
import type { DroppedFileInfo } from "../../interface/DroppedFileInfo";

export interface EventSankeyProps {
  curData: DroppedFileInfo[][] | DroppedFileInfo[];
  height?: number;
}

interface ProcessedEvent {
  id: string;
  name: string;
  attendees: Set<string>;
  totalCount: number;
}

interface PositionedEvent extends ProcessedEvent {
  x: number;
  idx: number;
}

interface FlowLink {
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  count: number;
  isDropOff: boolean;
  hopDistance: number;
}

interface PaletteItem {
  bg: string;
  border: string;
}

const COLOR_PALETTE: readonly PaletteItem[] = [
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
] as const;

const VIEWBOX = { width: 1100, height: 600 } as const;
const DROP_OFF_RECT = { x: 80, y: 28, width: 940, height: 52 } as const;
const EVENT_BOX = { width: 84, height: 200, y: 220 } as const;

const getEarliestTimestamp = (file: DroppedFileInfo): number => {
  let min = Infinity;
  for (const { check_in_time, registration_time } of file.attendees) {
    const time = check_in_time ?? registration_time;
    if (time) {
      const val = new Date(time).getTime();
      if (!Number.isNaN(val) && val < min) min = val;
    }
  }
  return min === Infinity ? 0 : min;
};

export const EventSankeyChart = ({
  curData,
  height = 620,
}: EventSankeyProps): JSX.Element => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<FlowLink | null>(null);

  // 1. Flatten and sort events chronologically (exact original logic preserved)
  const events = useMemo<ProcessedEvent[]>(() => {
    const flat =
      Array.isArray(curData[0]) && "attendees" in (curData[0] as any[])[0]
        ? (curData as DroppedFileInfo[][]).flat()
        : (curData as DroppedFileInfo[]);

    return [...flat]
      .sort((a, b) => getEarliestTimestamp(a) - getEarliestTimestamp(b))
      .map((file, idx) => {
        const attendees = new Set<string>();
        for (const a of file.attendees) {
          const id =
            a.email?.trim().toLowerCase() ||
            `${a.first_name}_${a.last_name}`.trim().toLowerCase();
          if (id) attendees.add(id);
        }
        return {
          id: `E${idx + 1}`,
          name: file.name || `Event ${idx + 1}`,
          attendees,
          totalCount: attendees.size,
        };
      });
  }, [curData]);

  // 2. Precompute positions and lookup map
  const { eventPositions, positionMap } = useMemo(() => {
    if (events.length === 0) {
      return {
        eventPositions: [] as PositionedEvent[],
        positionMap: new Map<string, PositionedEvent>(),
      };
    }

    const margin = 80;
    const availableWidth = VIEWBOX.width - margin * 2 - EVENT_BOX.width;
    const step = events.length > 1 ? availableWidth / (events.length - 1) : 0;

    const list: PositionedEvent[] = events.map((event, idx) => ({
      ...event,
      idx,
      x:
        events.length === 1
          ? (VIEWBOX.width - EVENT_BOX.width) / 2
          : margin + idx * step,
    }));

    return {
      eventPositions: list,
      positionMap: new Map<string, PositionedEvent>(list.map((e) => [e.id, e])),
    };
  }, [events]);

  // 3. Compute pairwise overlaps first, then calculate drop-off last from the remainder
  const { flows, totalDropOff, maxAttendees } = useMemo(() => {
    if (events.length === 0)
      return { flows: [], totalDropOff: 0, maxAttendees: 1 };

    const computedFlows: FlowLink[] = [];
    let cumulativeDropOff = 0;
    let maxAttendance = 1;

    for (let i = 0; i < events.length; i++) {
      const source = events[i];
      if (source.totalCount > maxAttendance) maxAttendance = source.totalCount;

      const targetCounts = new Uint32Array(events.length);

      for (const attendee of source.attendees) {
        for (let j = i + 1; j < events.length; j++) {
          if (events[j].attendees.has(attendee)) {
            targetCounts[j]++;
          }
        }
      }

      // 1. Push all subsequent event links first & sum their counts
      let subsequentSum = 0;
      for (let j = i + 1; j < events.length; j++) {
        const count = targetCounts[j];
        if (count > 0) {
          subsequentSum += count;
          computedFlows.push({
            fromId: source.id,
            toId: events[j].id,
            fromName: source.name,
            toName: events[j].name,
            count,
            isDropOff: false,
            hopDistance: j - i,
          });
        }
      }

      // 2. Calculate Drop-Off LAST: Box Total - (x + y + ...)
      const droppedCount = Math.max(0, source.totalCount - subsequentSum);
      cumulativeDropOff += droppedCount;

      if (droppedCount > 0) {
        computedFlows.push({
          fromId: source.id,
          toId: "DROP_OFF",
          fromName: source.name,
          toName: "Drop Off",
          count: droppedCount,
          isDropOff: true,
          hopDistance: 0,
        });
      }
    }

    return {
      flows: computedFlows,
      totalDropOff: cumulativeDropOff,
      maxAttendees: maxAttendance,
    };
  }, [events]);

  const receivingTargetIds = useMemo<Set<string>>(() => {
    if (!selectedEventId || selectedEventId === "DROP_OFF") {
      return new Set<string>();
    }
    const targets = new Set<string>();
    for (const f of flows) {
      if (f.fromId === selectedEventId && !f.isDropOff && f.count > 0) {
        targets.add(f.toId);
      }
    }
    return targets;
  }, [selectedEventId, flows]);

  return (
    <div className="w-full bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6 select-none font-sans">
      {/* Header matching MajorDistributionChart */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
              Attendee Journey & Reappearance Analysis
            </h4>
            {selectedEventId && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Outbound Filter: {selectedEventId}
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Clicking an event focuses solely on its outbound attendees.
            Multistage links route clearly below intervening boxes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-500">
            Total Events: {events.length}
          </span>
          {selectedEventId && (
            <button
              type="button"
              onClick={() => setSelectedEventId(null)}
              className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 px-3 py-1.5 rounded-md border border-slate-200 transition"
            >
              Reset Focus
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <div style={{ height: `${height}px` }} className="relative w-full">
        <svg
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient
              id="dropOffBoxGrad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#f1f5f9" />
            </linearGradient>
          </defs>

          {/* Top Drop-Off Box */}
          <g
            className="cursor-pointer group"
            onClick={() =>
              setSelectedEventId((prev) =>
                prev === "DROP_OFF" ? null : "DROP_OFF",
              )
            }
          >
            <rect
              {...DROP_OFF_RECT}
              rx={8}
              fill="url(#dropOffBoxGrad)"
              stroke={
                selectedEventId === "DROP_OFF" ? "rgb(225, 29, 72)" : "#cbd5e1"
              }
              strokeWidth={selectedEventId === "DROP_OFF" ? 2 : 1.5}
              className="transition-colors duration-200 group-hover:stroke-slate-400"
            />
            <text
              x={DROP_OFF_RECT.x + DROP_OFF_RECT.width / 2}
              y={DROP_OFF_RECT.y + DROP_OFF_RECT.height / 2 + 4}
              textAnchor="middle"
              className="text-xs font-bold fill-slate-600 tracking-wide uppercase pointer-events-none"
            >
              Drop Off &bull; {totalDropOff} Non-Returning Attendees
            </text>
          </g>

          {/* Flow Links */}
          <g>
            {flows.map((flow) => {
              const fromEvent = positionMap.get(flow.fromId);
              if (!fromEvent) return null;

              return (
                <FlowRibbon
                  key={`${flow.fromId}-${flow.toId}`}
                  flow={flow}
                  fromEvent={fromEvent}
                  toEvent={
                    flow.isDropOff ? undefined : positionMap.get(flow.toId)
                  }
                  totalEvents={events.length}
                  maxAttendees={maxAttendees}
                  selectedEventId={selectedEventId}
                  isHovered={
                    hoveredLink?.fromId === flow.fromId &&
                    hoveredLink?.toId === flow.toId
                  }
                  onHover={setHoveredLink}
                  onSelect={setSelectedEventId}
                />
              );
            })}
          </g>

          {/* Event Nodes */}
          {eventPositions.map((event) => (
            <EventNode
              key={event.id}
              event={event}
              selectedEventId={selectedEventId}
              isTarget={receivingTargetIds.has(event.id)}
              onSelect={setSelectedEventId}
            />
          ))}
        </svg>

        {/* Floating Tooltip */}
        {hoveredLink && (
          <div className="absolute top-2 right-2 bg-white/95 border border-slate-200 backdrop-blur-sm rounded-lg p-3 shadow-md pointer-events-none min-w-[220px]">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 border-b border-slate-100 pb-1.5 mb-2 flex items-center justify-between">
              <span>Path Insight</span>
              <span className="text-slate-800 font-bold">
                {hoveredLink.count} Attendees
              </span>
            </div>
            <div className="text-xs text-slate-700">
              <span className="font-semibold text-blue-600">
                {hoveredLink.fromName}
              </span>
              {" → "}
              <span
                className={`font-semibold ${
                  hoveredLink.isDropOff ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {hoveredLink.toName}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {hoveredLink.isDropOff
                ? "Did not attend any later stages."
                : `Proceeded ${
                    hoveredLink.hopDistance > 1
                      ? `(skipping ${hoveredLink.hopDistance - 1} event)`
                      : "directly"
                  } to this event.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

interface FlowRibbonProps {
  flow: FlowLink;
  fromEvent: PositionedEvent;
  toEvent?: PositionedEvent;
  totalEvents: number;
  maxAttendees: number;
  selectedEventId: string | null;
  isHovered: boolean;
  onHover: (flow: FlowLink | null) => void;
  onSelect: React.Dispatch<React.SetStateAction<string | null>>;
}

const FlowRibbon: React.FC<FlowRibbonProps> = React.memo(
  ({
    flow,
    fromEvent,
    toEvent,
    totalEvents,
    maxAttendees,
    selectedEventId,
    isHovered,
    onHover,
    onSelect,
  }) => {
    const palette = COLOR_PALETTE[fromEvent.idx % COLOR_PALETTE.length];
    const isOutboundFlow =
      selectedEventId === null ||
      (selectedEventId === "DROP_OFF"
        ? flow.isDropOff
        : flow.fromId === selectedEventId);

    const fillOpacity = !isOutboundFlow ? 0.04 : isHovered ? 0.55 : 0.25;
    const strokeOpacity = !isOutboundFlow ? 0.08 : isHovered ? 0.95 : 0.6;
    const strokeWidth = isHovered
      ? 2
      : isOutboundFlow && selectedEventId !== null
        ? 1.5
        : 1;
    const ribbonWidth = Math.max(
      6,
      Math.min(30, (flow.count / maxAttendees) * 44),
    );

    let pathData = "";
    let labelX = 0;
    let labelY = 0;

    if (flow.isDropOff) {
      const startX = fromEvent.x + EVENT_BOX.width / 2;
      const startY = EVENT_BOX.y;
      const endX =
        DROP_OFF_RECT.x +
        ((fromEvent.idx + 0.5) / totalEvents) * DROP_OFF_RECT.width;
      const endY = DROP_OFF_RECT.y + DROP_OFF_RECT.height;

      const cY1 = startY - 75;
      const cY2 = endY + 65;

      pathData = `
        M ${startX - ribbonWidth / 2} ${startY}
        C ${startX - ribbonWidth / 2} ${cY1}, ${endX - ribbonWidth / 2} ${cY2}, ${endX - ribbonWidth / 2} ${endY}
        L ${endX + ribbonWidth / 2} ${endY}
        C ${endX + ribbonWidth / 2} ${cY2}, ${startX + ribbonWidth / 2} ${cY1}, ${startX + ribbonWidth / 2} ${startY}
        Z
      `;
      labelX = (startX + endX) / 2;
      labelY = (startY + endY) / 2 - 12;
    } else if (toEvent) {
      const isDirect = flow.hopDistance === 1;
      const startX = fromEvent.x + EVENT_BOX.width;
      const endX = toEvent.x;

      const yAnchor = isDirect
        ? EVENT_BOX.y + 36
        : EVENT_BOX.y + 110 + (flow.hopDistance - 2) * 28;
      const sag = isDirect ? 0 : EVENT_BOX.height - 80 + flow.hopDistance * 45;

      const cX1 = startX + (endX - startX) * 0.35;
      const cY1 = yAnchor + sag;
      const cX2 = startX + (endX - startX) * 0.65;
      const cY2 = yAnchor + sag;

      pathData = isDirect
        ? `
          M ${startX} ${yAnchor - ribbonWidth / 2}
          L ${endX} ${yAnchor - ribbonWidth / 2}
          L ${endX} ${yAnchor + ribbonWidth / 2}
          L ${startX} ${yAnchor + ribbonWidth / 2}
          Z
        `
        : `
          M ${startX} ${yAnchor - ribbonWidth / 2}
          C ${cX1} ${cY1 - ribbonWidth / 2}, ${cX2} ${cY2 - ribbonWidth / 2}, ${endX} ${yAnchor - ribbonWidth / 2}
          L ${endX} ${yAnchor + ribbonWidth / 2}
          C ${cX2} ${cY2 + ribbonWidth / 2}, ${cX1} ${cY1 + ribbonWidth / 2}, ${startX} ${yAnchor + ribbonWidth / 2}
          Z
        `;

      labelX = (startX + endX) / 2;
      labelY = isDirect ? yAnchor : yAnchor + 0.75 * sag;
    }

    return (
      <g
        className="cursor-pointer transition-opacity duration-200"
        onMouseEnter={() => onHover(flow)}
        onMouseLeave={() => onHover(null)}
        onClick={() =>
          onSelect((prev) => (prev === flow.fromId ? null : flow.fromId))
        }
      >
        <path
          d={pathData}
          fill={palette.border}
          fillOpacity={fillOpacity}
          stroke={palette.border}
          strokeWidth={strokeWidth}
          strokeOpacity={strokeOpacity}
        />
        {isOutboundFlow && (
          <g className="pointer-events-none">
            <rect
              x={labelX - 14}
              y={labelY - (flow.isDropOff ? 11 : 10)}
              width={28}
              height={18}
              rx={4}
              fill="#ffffff"
              stroke={palette.border}
              strokeWidth={1.25}
            />
            <text
              x={labelX}
              y={labelY + (flow.isDropOff ? 2 : 3)}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] font-bold fill-slate-700"
            >
              {flow.count}
            </text>
          </g>
        )}
      </g>
    );
  },
);

interface EventNodeProps {
  event: PositionedEvent;
  selectedEventId: string | null;
  isTarget: boolean;
  onSelect: React.Dispatch<React.SetStateAction<string | null>>;
}

const EventNode: React.FC<EventNodeProps> = React.memo(
  ({ event, selectedEventId, isTarget, onSelect }) => {
    const palette = COLOR_PALETTE[event.idx % COLOR_PALETTE.length];
    const isSourceSelected = selectedEventId === event.id;
    const isHighlighted =
      selectedEventId === null || isSourceSelected || isTarget;
    const isMuted = !isHighlighted;

    return (
      <g
        className="cursor-pointer transition-all duration-200"
        onClick={() =>
          onSelect((prev) => (prev === event.id ? null : event.id))
        }
      >
        {/* Main Card Body */}
        <rect
          x={event.x}
          y={EVENT_BOX.y}
          width={EVENT_BOX.width}
          height={EVENT_BOX.height}
          rx={6}
          fill="#ffffff"
          stroke={isSourceSelected ? palette.border : "#cbd5e1"}
          strokeWidth={isSourceSelected ? 2.5 : isTarget ? 2 : 1}
          strokeOpacity={isMuted ? 0.4 : 1}
        />

        {/* Top Header Band */}
        <rect
          x={event.x}
          y={EVENT_BOX.y}
          width={EVENT_BOX.width}
          height={36}
          rx={6}
          fill={palette.bg}
          stroke={palette.border}
          strokeWidth={1}
          fillOpacity={isMuted ? 0.3 : 1}
          strokeOpacity={isMuted ? 0.3 : 1}
        />
        <text
          x={event.x + EVENT_BOX.width / 2}
          y={EVENT_BOX.y + 23}
          textAnchor="middle"
          className="text-sm font-bold fill-white pointer-events-none tracking-wide"
          fillOpacity={isMuted ? 0.5 : 1}
        >
          {event.id}
        </text>

        {/* Total Attendee Count */}
        <text
          x={event.x + EVENT_BOX.width / 2}
          y={EVENT_BOX.y + 68}
          textAnchor="middle"
          className="text-2xl font-bold fill-slate-800 pointer-events-none"
          fillOpacity={isMuted ? 0.3 : 1}
        >
          {event.totalCount}
        </text>
        <text
          x={event.x + EVENT_BOX.width / 2}
          y={EVENT_BOX.y + 84}
          textAnchor="middle"
          className="text-[10px] font-semibold uppercase tracking-wide fill-slate-500 pointer-events-none"
          fillOpacity={isMuted ? 0.3 : 1}
        >
          Attendees
        </text>

        <line
          x1={event.x + 10}
          y1={EVENT_BOX.y + 96}
          x2={event.x + EVENT_BOX.width - 10}
          y2={EVENT_BOX.y + 96}
          stroke="#e2e8f0"
          strokeWidth={1}
        />

        {/* Event Title */}
        <foreignObject
          x={event.x + 6}
          y={EVENT_BOX.y + 102}
          width={EVENT_BOX.width - 12}
          height={EVENT_BOX.height - 108}
        >
          <div className="w-full h-full flex items-start justify-center overflow-hidden">
            <p
              className={`text-[11px] font-medium leading-tight text-center break-words line-clamp-4 ${
                isMuted ? "text-slate-400" : "text-slate-700"
              }`}
            >
              {event.name}
            </p>
          </div>
        </foreignObject>
      </g>
    );
  },
);

export default EventSankeyChart;
