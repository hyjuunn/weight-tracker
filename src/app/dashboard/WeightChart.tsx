"use client";

import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

type LogItem = {
  dateKey: string;
  weightKg?: number | null;
};

export default function WeightChart({ items }: { items: LogItem[] }) {
  const data = items
    .filter((x) => typeof x.weightKg === "number")
    .map((x) => ({
      dateKey: x.dateKey,
      dateLabel: x.dateKey.slice(5),
      weight: x.weightKg as number,
    }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  if (data.length === 0) {
    return <p className="text-sm text-slate-300">No weight data to chart yet.</p>;
  }

  const weights = data.map((d) => d.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const pad = Math.max(0.5, (max - min) * 0.2);

  const yMin = Math.floor((min - pad) * 10) / 10;
  const yMax = Math.ceil((max + pad) * 10) / 10;

  return (
    <div className="w-full" style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 16, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
          <XAxis dataKey="dateLabel" tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={{ stroke: "rgba(255,255,255,0.2)" }} tickLine={{ stroke: "rgba(255,255,255,0.2)" }} />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fill: "#cbd5e1", fontSize: 12 }}
            axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
            tickLine={{ stroke: "rgba(255,255,255,0.2)" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(8, 11, 17, 0.9)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "12px",
              color: "#f8fafc",
            }}
            formatter={(value) => [`${value} kg`, "Weight"]}
            labelFormatter={(label, payload) => {
              const full = payload?.[0]?.payload?.dateKey;
              return full ? full : label;
            }}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#f8fafc"
            strokeWidth={2.5}
            dot={{ r: 4, strokeWidth: 2, fill: "#0b0d12", stroke: "#f8fafc" }}
            activeDot={{ r: 6, fill: "#f8fafc", stroke: "#0b0d12", strokeWidth: 2 }}
          >
            <LabelList
              dataKey="weight"
              position="top"
              fill="#e2e8f0"
              fontSize={12}
              formatter={(v) =>
                typeof v === "number" ? v.toFixed(1) : String(v ?? "")
              }
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
