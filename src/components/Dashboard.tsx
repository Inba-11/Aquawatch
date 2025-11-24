import { useState, useEffect } from "react";
import CircularProgress from "./CircularProgress";
import ParameterCard from "./ParameterCard";
import AIInsights from "./AIInsights";
import HistoricalChart from "./HistoricalChart";
import { Droplet } from "lucide-react";
import { NavLink } from "./NavLink";

interface SensorData {
  ph: number;
  tds: number;
  turbidity: number;
  timestamp: Date;
}

type TimeRange = "1day" | "1month" | "6months";

interface HistoryPoint {
  time: string;
  ph: number;
  tds: number;
  turbidity: number;
}

type HistorySeries = HistoryPoint[];

interface HistoricalData {
  "1d": HistorySeries;
  "1m": HistorySeries;
  "6m": HistorySeries;
}

const Dashboard = () => {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  const [historicalData, setHistoricalData] = useState<HistoricalData>({
    "1d": [],
    "1m": [],
    "6m": [],
  });

  const [timeRange, setTimeRange] = useState<TimeRange>("1day");

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        // Use proxy in development, direct URL in production
        const apiUrl = import.meta.env.DEV 
          ? "/api/latest" 
          : "http://127.0.0.1:8000/latest";
        console.log("Fetching sensor data from", apiUrl);
        const res = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-cache",
          mode: "cors", // Explicitly set CORS mode
        });
        
        console.log("Response status:", res.status, res.statusText);
        
        if (!res.ok) {
          if (res.status === 404) {
            console.warn("No sensor data available yet");
            setError("No sensor data available. Make sure Arduino is sending data.");
            setIsLoading(false);
            return;
          }
          const errorText = await res.text();
          throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
        }
        
        const data = await res.json();
        console.log("Fetched sensor data:", data);
        
        // Validate data structure
        if (!data.ph || !data.tds || !data.turbidity || !data.timestamp) {
          throw new Error("Invalid data structure received from API");
        }
        
        // Always update with fresh data from API
        const newSensorData: SensorData = {
          ph: parseFloat(data.ph),
          tds: parseFloat(data.tds),
          turbidity: parseFloat(data.turbidity),
          timestamp: new Date(data.timestamp),
        };
        
        setSensorData(newSensorData);
        setLastFetchTime(new Date());
        setIsLoading(false);
        setError(null); // Clear any previous errors
      } catch (error) {
        console.error("Error fetching latest sensor data:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setError(`Failed to fetch sensor data: ${errorMessage}. Make sure backend is running at http://127.0.0.1:8000`);
        setIsLoading(false);
      }
    };

    // Fetch immediately on mount
    fetchLatest();
    // Then fetch every 2 seconds
    const interval = setInterval(fetchLatest, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadHistory = async (range: TimeRange) => {
      try {
        const apiUrl = import.meta.env.DEV 
          ? `/api/history?period=${range}` 
          : `http://127.0.0.1:8000/history?period=${range}`;
        const res = await fetch(apiUrl, {
          cache: "no-cache",
        });
        if (!res.ok) {
          if (res.status === 400) {
            console.error("Invalid period parameter");
            return;
          }
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        const mapped: HistorySeries = data.map((point: HistoryPoint) => ({
          time: point.time,
          ph: point.ph,
          tds: point.tds,
          turbidity: point.turbidity,
        }));

        setHistoricalData((prev) => {
          if (range === "1day") {
            return { ...prev, "1d": mapped };
          }
          if (range === "1month") {
            return { ...prev, "1m": mapped };
          }
          return { ...prev, "6m": mapped };
        });
      } catch (error) {
        console.error("Error fetching history", error);
        // Set empty array on error to show no data
        setHistoricalData((prev) => {
          if (range === "1day") {
            return { ...prev, "1d": [] };
          }
          if (range === "1month") {
            return { ...prev, "1m": [] };
          }
          return { ...prev, "6m": [] };
        });
      }
    };

    loadHistory(timeRange);
  }, [timeRange]);

  // Determine status for each parameter
  const getPhStatus = (ph: number) => {
    if (ph >= 6.5 && ph <= 8.5) return "safe";
    if (ph >= 6.0 && ph <= 9.0) return "warning";
    return "danger";
  };

  const getTdsStatus = (tds: number) => {
    if (tds <= 150) return "safe";
    if (tds <= 300) return "warning";
    return "danger";
  };

  const getTurbidityStatus = (turbidity: number) => {
    if (turbidity <= 5) return "safe";
    if (turbidity <= 10) return "warning";
    return "danger";
  };

  // Generate dynamic insights based on actual sensor data
  const generateInsights = (
    data: SensorData,
    phStatus: string,
    tdsStatus: string,
    turbidityStatus: string
  ): string => {
    const issues: string[] = [];
    const positives: string[] = [];

    // pH analysis
    if (phStatus === "safe") {
      positives.push(`pH level of ${data.ph.toFixed(1)} is within the optimal range (6.5-8.5)`);
    } else if (phStatus === "warning") {
      issues.push(`pH level of ${data.ph.toFixed(1)} is outside the optimal range`);
    } else {
      issues.push(`pH level of ${data.ph.toFixed(1)} requires immediate attention`);
    }

    // TDS analysis
    if (tdsStatus === "safe") {
      positives.push(`TDS of ${data.tds.toFixed(0)} ppm indicates good water quality`);
    } else if (tdsStatus === "warning") {
      issues.push(`TDS of ${data.tds.toFixed(0)} ppm is elevated`);
    } else {
      issues.push(`TDS of ${data.tds.toFixed(0)} ppm is very high and needs treatment`);
    }

    // Turbidity analysis
    if (turbidityStatus === "safe") {
      positives.push(`Turbidity of ${data.turbidity.toFixed(1)} NTU shows clear water`);
    } else if (turbidityStatus === "warning") {
      issues.push(`Turbidity of ${data.turbidity.toFixed(1)} NTU indicates some cloudiness`);
    } else {
      issues.push(`Turbidity of ${data.turbidity.toFixed(1)} NTU is very high - water needs filtration`);
    }

    if (issues.length === 0) {
      return `Your water quality is excellent. ${positives.join(". ")}. Continue monitoring to maintain these levels.`;
    } else if (issues.length === 1) {
      return `${positives.length > 0 ? positives.join(". ") + ". " : ""}However, ${issues[0]}. Consider taking appropriate action.`;
    } else {
      return `Water quality needs attention. ${issues.join(". ")}. ${positives.length > 0 ? "On the positive side, " + positives.join(". ") + "." : "Immediate action recommended."}`;
    }
  };

  // Calculate confidence based on status
  const calculateConfidence = (
    phStatus: string,
    tdsStatus: string,
    turbidityStatus: string
  ): number => {
    let safeCount = 0;
    if (phStatus === "safe") safeCount++;
    if (tdsStatus === "safe") safeCount++;
    if (turbidityStatus === "safe") safeCount++;

    // Confidence based on how many parameters are in safe range
    if (safeCount === 3) return 95;
    if (safeCount === 2) return 75;
    if (safeCount === 1) return 50;
    return 30;
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading sensor data...</p>
          <p className="text-sm text-muted-foreground mt-2">Connecting to backend...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !sensorData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-destructive text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">Connection Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="bg-muted p-4 rounded-lg text-left text-sm">
            <p className="font-semibold mb-2">Troubleshooting steps:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Make sure the backend is running: <code className="bg-background px-1 rounded">uvicorn backend.main:app --reload</code></li>
              <li>Check backend is accessible at <code className="bg-background px-1 rounded">http://127.0.0.1:8000</code></li>
              <li>Open browser console (F12) to see detailed error messages</li>
              <li>Check for CORS errors in the console</li>
            </ol>
          </div>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              window.location.reload();
            }}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show error but with existing data (non-blocking)
  if (error && sensorData) {
    console.warn("Error occurred but showing last known data:", error);
  }

  // If we still don't have sensor data after loading, show error
  if (!sensorData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-destructive text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">No Data Available</h2>
          <p className="text-muted-foreground mb-4">
            {error || "Unable to load sensor data. Please check your connection."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const phStatus = getPhStatus(sensorData.ph);
  const tdsStatus = getTdsStatus(sensorData.tds);
  const turbidityStatus = getTurbidityStatus(sensorData.turbidity);

  // Convert to percentage for display
  const phPercentage = ((sensorData.ph - 0) / 14) * 100;
  const tdsPercentage = Math.min((sensorData.tds / 500) * 100, 100); // Cap at 100%
  const turbidityPercentage = Math.min((sensorData.turbidity / 20) * 100, 100); // Cap at 100%

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AquaWatch
            </NavLink>
            <NavLink to="/" className="text-foreground hover:text-primary transition-colors">
              Dashboard
            </NavLink>
          </div>
        </div>
      </nav>
      
      {/* Header */}
      <header className="bg-gradient-primary shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Droplet className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-3xl font-bold text-white">AquaWatch</h1>
              <p className="text-white/80 text-sm">Real-time water quality monitoring</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Real-time indicator */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse-glow" />
          <span className="text-sm text-muted-foreground">
            Live monitoring • Last update: {sensorData.timestamp.toLocaleTimeString()}
            {lastFetchTime && ` • Fetched: ${lastFetchTime.toLocaleTimeString()}`}
          </span>
        </div>

        {/* Circular Progress Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="flex flex-col items-center animate-fade-in">
            <CircularProgress
              value={phPercentage}
              maxValue={100}
              status={phStatus}
              label="pH Level"
              unit=""
            />
            <div className="mt-4 text-center">
              <p className="text-2xl font-bold text-foreground">{sensorData.ph.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Current pH</p>
            </div>
          </div>

          <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <CircularProgress
              value={tdsPercentage}
              maxValue={100}
              status={tdsStatus}
              label="TDS"
              unit=""
            />
            <div className="mt-4 text-center">
              <p className="text-2xl font-bold text-foreground">{sensorData.tds.toFixed(0)} ppm</p>
              <p className="text-sm text-muted-foreground">Total Dissolved Solids</p>
            </div>
          </div>

          <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <CircularProgress
              value={turbidityPercentage}
              maxValue={100}
              status={turbidityStatus}
              label="Turbidity"
              unit=""
            />
            <div className="mt-4 text-center">
              <p className="text-2xl font-bold text-foreground">{sensorData.turbidity.toFixed(1)} NTU</p>
              <p className="text-sm text-muted-foreground">Water Clarity</p>
            </div>
          </div>
        </div>

        {/* Parameter Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <ParameterCard
            title="pH Level"
            description="Measures water acidity or alkalinity. Ideal range is 6.5-8.5 for safe drinking water."
            status={phStatus}
            statusText={
              phStatus === "safe" ? "Optimal" : phStatus === "warning" ? "Monitor" : "Action Required"
            }
            recommendation={
              phStatus !== "safe"
                ? "Consider adding pH neutralizing filters or water treatment systems."
                : undefined
            }
          />

          <ParameterCard
            title="Total Dissolved Solids"
            description="Indicates mineral content in water. Lower TDS generally means purer water."
            status={tdsStatus}
            statusText={
              tdsStatus === "safe" ? "Excellent" : tdsStatus === "warning" ? "Acceptable" : "High"
            }
            recommendation={
              tdsStatus !== "safe"
                ? "Install RO filter or use water softener to reduce mineral content."
                : undefined
            }
          />

          <ParameterCard
            title="Turbidity"
            description="Measures water clarity and suspended particles. Lower values indicate clearer water."
            status={turbidityStatus}
            statusText={
              turbidityStatus === "safe" ? "Clear" : turbidityStatus === "warning" ? "Cloudy" : "Very Cloudy"
            }
            recommendation={
              turbidityStatus !== "safe"
                ? "Use sediment filters or let water settle before consumption."
                : undefined
            }
          />
        </div>

        {/* AI Insights */}
        <div className="mb-8">
          <AIInsights
            insights={generateInsights(sensorData, phStatus, tdsStatus, turbidityStatus)}
            confidence={calculateConfidence(phStatus, tdsStatus, turbidityStatus)}
          />
        </div>

        {/* Historical Chart */}
        <HistoricalChart
          data={historicalData}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
      </div>
    </div>
  );
};

export default Dashboard;
