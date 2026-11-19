"use client";

import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { dayjs } from "@/lib/time";

export type GradePoint = { at: string; percent: number };

// One class's grade over time. Single series: the card title names it, so no legend.
// Goal is a recessive dashed reference line; hover shows date + exact grade.
export function GradeChart({ points, goal, color }: { points: GradePoint[]; goal: number; color: string }) {
  const data = points.map((p) => ({ t: new Date(p.at).getTime(), percent: p.percent }));
  const values = [...data.map((d) => d.percent), goal];
  // Keep the y-range tight around the data and the goal so small changes are visible
  const min = Math.max(0, Math.floor((Math.min(...values) - 4) / 5) * 5);
  const max = Math.min(110, Math.ceil((Math.max(...values) + 2) / 5) * 5);

  return (
    <div className="h-28 w-full" role="img" aria-label={`Grade trend, ${data.length} checks`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t: number) => dayjs(t).format("MMM D")}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            minTickGap={24}
            hide={data.length < 2}
          />
          <YAxis
            domain={[min, max]}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={42}
            tickCount={3}
            tickFormatter={(v: number) => `${v}%`}
          />
          <ReferenceLine
            y={goal}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            strokeOpacity={0.6}
            label={{ value: `Goal ${goal}%`, position: "insideTopRight", fontSize: 10, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            labelFormatter={(t) => dayjs(Number(t)).format("ddd, MMM D, h:mm A")}
            formatter={(v) => [`${Number(v)}%`, "Grade"]}
          />
          <Line
            type="monotone"
            dataKey="percent"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 4, fill: color, stroke: "var(--background)", strokeWidth: 2 }}
            activeDot={{ r: 5, stroke: "var(--background)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
