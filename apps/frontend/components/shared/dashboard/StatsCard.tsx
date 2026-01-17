import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Card, CardContent, CardHeader } from "../../ui/card";
import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  value: string | number;
  type?: "card" | "chart";
  label: string;
  iconBgColor?: string;
  iconColor?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  description?: string;
  trendPercentage?: number;
  previousValue?: number;
  chart?: React.ReactNode;
  chartConfig?: ChartConfig;
}

export function StatsCard({
  icon: Icon,
  value,
  type = "card",
  label,
  iconBgColor = "bg-accent",
  iconColor = "text-primary",
  valuePrefix = "",
  valueSuffix = "",
  description = "",
  trendPercentage = 0,
  previousValue = 0,
  chart,
  chartConfig,
}: StatsCardProps) {
  return (
    <Card variant="muted">
      {type === "card" ? (
        <CardContent className="p-6 gap-0">
          <div className="flex flex-row items-center gap-4">
            <div className={`p-3 ${iconBgColor} rounded-xl self-start`}>
              <Icon className={`size-5 ${iconColor}`} />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{label}</div>
              <div className="text-3xl font-bold text-foreground mb-1 flex items-baseline gap-1">
                {valuePrefix}
                <span className="flex items-baseline gap-1">
                  {value}
                  {trendPercentage !== 0 &&
                    (trendPercentage > 0 ? (
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <TrendingUp className="size-4" />
                        <span>{trendPercentage}%</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-sm text-red-600">
                        <TrendingDown className="size-4" />
                        <span>{trendPercentage}%</span>
                      </div>
                    ))}
                </span>
                {valueSuffix}
              </div>
              {description && (
                <div className="text-xs text-muted-foreground mt-1">
                  {description}
                </div>
              )}
              {previousValue !== 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  Previous month: {previousValue}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      ) : (
        <CardContent className="p-6 gap-0">
          <div className="flex flex-col items-start gap-4">
              <div className="flex flex-row items-center gap-4 w-full">
                <div className={`p-3 ${iconBgColor} rounded-xl self-start`}>
                  <Icon className={`size-5 ${iconColor}`} />
                </div>
                <div className="text-sm text-muted-foreground">{label}</div>
              </div>
              <ChartContainer config={chartConfig || {}} className="h-[300px] w-full">
                <div className="w-full">{chart}</div>
              </ChartContainer>
            </div>
        </CardContent>
      )}
    </Card>
  );
}
