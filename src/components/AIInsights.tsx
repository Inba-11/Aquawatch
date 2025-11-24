import { Card } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AIInsightsProps {
  isLoading?: boolean;
  insights?: string;
  confidence?: number;
}

const AIInsights = ({ isLoading = false, insights, confidence }: AIInsightsProps) => {
  return (
    <Card className="p-6 bg-gradient-wave border-primary/20 shadow-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">AI-Powered Insights</h3>
          {confidence && (
            <Badge variant="secondary" className="mt-1">
              {confidence}% Confidence
            </Badge>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="ml-3 text-muted-foreground">Analyzing water quality...</span>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-foreground leading-relaxed">
            {insights || "Based on current water quality readings, your water is within acceptable parameters. Continue regular monitoring to maintain quality."}
          </p>
          
          <div className="pt-4 border-t border-border">
            <h4 className="font-semibold text-sm text-foreground mb-2">
              Recommended Actions:
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Monitor pH levels regularly to prevent fluctuations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Check TDS values weekly for mineral content consistency</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Maintain turbidity below 5 NTU for optimal clarity</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AIInsights;
