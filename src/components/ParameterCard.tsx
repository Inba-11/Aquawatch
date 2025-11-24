import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

interface ParameterCardProps {
  title: string;
  description: string;
  status: "safe" | "warning" | "danger";
  statusText: string;
  recommendation?: string;
}

const ParameterCard = ({
  title,
  description,
  status,
  statusText,
  recommendation,
}: ParameterCardProps) => {
  const statusConfig = {
    safe: {
      icon: CheckCircle,
      color: "bg-success/10 text-success border-success/20",
      badgeVariant: "default" as const,
    },
    warning: {
      icon: AlertTriangle,
      color: "bg-warning/10 text-warning border-warning/20",
      badgeVariant: "secondary" as const,
    },
    danger: {
      icon: AlertCircle,
      color: "bg-destructive/10 text-destructive border-destructive/20",
      badgeVariant: "destructive" as const,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card className="p-6 shadow-card hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <Badge variant={config.badgeVariant} className="gap-1">
          <Icon className="w-3 h-3" />
          {statusText}
        </Badge>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {description}
      </p>
      
      {recommendation && (
        <div className={cn("p-3 rounded-lg border", config.color)}>
          <p className="text-sm font-medium flex items-start gap-2">
            <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{recommendation}</span>
          </p>
        </div>
      )}
    </Card>
  );
};

export default ParameterCard;
