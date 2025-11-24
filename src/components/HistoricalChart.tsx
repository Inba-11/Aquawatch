import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface HistoricalChartProps {
  data: {
    "1d": Array<{ time: string; ph: number; tds: number; turbidity: number }>;
    "1m": Array<{ time: string; ph: number; tds: number; turbidity: number }>;
    "6m": Array<{ time: string; ph: number; tds: number; turbidity: number }>;
  };
  timeRange: "1day" | "1month" | "6months";
  onTimeRangeChange: (range: "1day" | "1month" | "6months") => void;
}

const HistoricalChart = ({ data, timeRange, onTimeRangeChange }: HistoricalChartProps) => {
  const key = timeRange === "1day" ? "1d" : timeRange === "1month" ? "1m" : "6m";
  const currentData = data[key];
  
  // Calculate trends (simplified)
  const calculateTrend = (values: number[]) => {
    if (values.length < 2) return "stable";
    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;
    
    if (change > 5) return "up";
    if (change < -5) return "down";
    return "stable";
  };

  const phTrend = calculateTrend(currentData.map(d => d.ph));
  const tdsTrend = calculateTrend(currentData.map(d => d.tds));
  const turbidityTrend = calculateTrend(currentData.map(d => d.turbidity));

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-destructive" />;
    if (trend === "down") return <TrendingDown className="w-4 h-4 text-success" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <Card className="p-6 shadow-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Historical Trends</h3>
        <div className="flex gap-2">
          <Button
            variant={timeRange === "1day" ? "default" : "outline"}
            size="sm"
            onClick={() => onTimeRangeChange("1day")}
          >
            1 Day
          </Button>
          <Button
            variant={timeRange === "1month" ? "default" : "outline"}
            size="sm"
            onClick={() => onTimeRangeChange("1month")}
          >
            1 Month
          </Button>
          <Button
            variant={timeRange === "6months" ? "default" : "outline"}
            size="sm"
            onClick={() => onTimeRangeChange("6months")}
          >
            6 Months
          </Button>
        </div>
      </div>

      {/* Trend Indicators */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <TrendIcon trend={phTrend} />
          <span className="text-muted-foreground">pH</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <TrendIcon trend={tdsTrend} />
          <span className="text-muted-foreground">TDS</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <TrendIcon trend={turbidityTrend} />
          <span className="text-muted-foreground">Turbidity</span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={currentData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="time"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="ph"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="tds"
            stroke="hsl(var(--secondary))"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="turbidity"
            stroke="hsl(var(--warning))"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default HistoricalChart;
