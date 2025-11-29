import { Photographer, PhotographerRanking } from "../../../types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Progress } from "../../ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { ChartContainer, ChartConfig } from "../../ui/chart";
import {
  Star,
  MapPin,
  TrendingUp,
  Award,
  Briefcase,
  Building2,
  Heart,
  Info,
} from "lucide-react";
import { motion } from "framer-motion";
import { RadialBarChart, RadialBar, PolarGrid, PolarRadiusAxis, Label } from "recharts";
import { Separator } from "@/components/ui/separator";
import { getLocationDisplay } from "../../../lib/utils";
import { P } from '../../ui/typography';

interface PhotographerCardProps {
  photographer: Photographer;
  ranking?: PhotographerRanking["factors"];
  score?: number;
  recommended?: boolean;
  onAssign?: () => void;
  onClick?: () => void;
  showFullAddress?: boolean; // If false, only show city, state/province, and country
}

const scoreChartConfig = {
  score: {
    label: "Score",
  },
} satisfies ChartConfig;

export function PhotographerCard({
  photographer,
  ranking,
  score,
  recommended,
  onAssign,
  onClick,
  showFullAddress = false, // Default to false (only show city/state/country)
}: PhotographerCardProps) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "hsl(142, 76%, 36%)"; // emerald-600
    if (s >= 60) return "hsl(38, 92%, 50%)"; // amber-500
    return "hsl(0, 84%, 60%)"; // red-500
  };

  const isAvailable = ranking ? ranking.availability === 100 : true;

  const displayAddress = getLocationDisplay(photographer.homeLocation.address, showFullAddress);

  const scoreData = score !== undefined ? [
    {
      name: "score",
      value: score,
      fill: getScoreColor(score),
    },
  ] : [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card
        className={`relative h-full flex flex-col overflow-hidden transition-all duration-200 hover:shadow-xl cursor-pointer border-2 gap-0 ${
          recommended
            ? "border-green-500 shadow-lg shadow-green-100"
            : "border-transparent hover:border-border"
        }`}
        onClick={onClick}
      >
        <CardHeader className="pb-4 w-full">
          <div className="relative flex items-start gap-4 w-full min-w-0 overflow-hidden">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="size-16">
                <AvatarImage
                  src={photographer.avatar}
                  alt={photographer.name}
                />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {photographer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              {/* Status Indicator */}
              <div
                className={`absolute bottom-0 right-0 size-4 rounded-full border-2 border-white ${
                  isAvailable ? "bg-emerald-500" : "bg-gray-400"
                }`}
              />
            </div>

            {/* Name and Rating */}
            <div className="relative flex-1 min-w-0 overflow-hidden">
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="relative flex flex-col min-w-0 flex-1 overflow-hidden">
                  <CardTitle className="flex items-center gap-2 mb-1 min-w-0">
                    <span className="truncate min-w-0">{photographer.name}</span>
                    {recommended && (
                      <Award className="h-4 w-4 text-emerald-600 shrink-0" />
                    )}
                  </CardTitle>
                  {/* Company Affiliation */}
                  {!photographer.isIndependent && photographer.companyName && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <Building2 className="h-3 w-3 text-primary" />
                      <span className="text-xs text-primary">
                        {photographer.companyName}
                      </span>
                    </div>
                  )}
                  {photographer.isIndependent && (
                    <Badge
                      variant="outline"
                      className="text-xs mt-1.5 h-5 w-fit"
                    >
                      Independent
                    </Badge>
                  )}
                  {/* Preferred Vendor Indicator */}
                  {ranking && ranking.preferredRelationship > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                      <span className="text-xs text-destructive">
                        Preferred Vendor
                      </span>
                    </div>
                  )}
                  {/* Address */}
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground/80 min-w-0 w-full overflow-hidden">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {showFullAddress ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate block min-w-0">
                            {displayAddress}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <P className="wrap-break-word">{getLocationDisplay(photographer.homeLocation.address, true)}</P>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="truncate block min-w-0">
                        {displayAddress}
                      </span>
                    )}
                  </div>
                </div>

                {score !== undefined && (
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <ChartContainer
                            config={scoreChartConfig}
                            className="size-16 cursor-help"
                          >
                            <RadialBarChart
                              data={scoreData}
                              startAngle={90}
                              endAngle={90 - (score / 100) * 360}
                              innerRadius={25}
                              outerRadius={30}
                            >
                              <PolarGrid
                                gridType="circle"
                                radialLines={false}
                                stroke="none"
                                className="first:fill-muted last:fill-background"
                                polarRadius={[24, 30]}
                              />
                              <RadialBar
                                dataKey="value"
                                background
                                cornerRadius={10}
                                fill={scoreData[0]?.fill}
                              />
                              <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                                <Label
                                  content={({ viewBox }) => {
                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                      return (
                                        <text
                                          x={viewBox.cx}
                                          y={viewBox.cy}
                                          textAnchor="middle"
                                          dominantBaseline="middle"
                                        >
                                          <tspan
                                            x={viewBox.cx}
                                            y={viewBox.cy}
                                            className="fill-foreground text-lg font-semibold"
                                          >
                                            {score.toFixed(0)}
                                          </tspan>
                                        </text>
                                      );
                                    }
                                  }}
                                />
                              </PolarRadiusAxis>
                            </RadialBarChart>
                          </ChartContainer>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <P className="max-w-xs">
                          Overall match score calculated from availability, distance, skill match, and reliability. 
                          Higher scores indicate better fit for the job.
                        </P>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col space-y-4 justify-end">
          {/* Ranking Factors */}
          {ranking && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">Distance</span>
                  <span className="text-foreground">
                    {ranking.distanceKm.toFixed(1)}km
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">Reliability</span>
                  <span className="text-foreground">
                    {(photographer.reliability.onTimeRate * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Detailed Scores */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Skill Match</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <P className="text-xs">
                          Calculated by averaging the photographer's skill ratings (1-5 scale) for each media type required by the job. 
                          The average is converted to a percentage (multiplied by 20).
                        </P>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="text-foreground">
                    {ranking.skillMatch.toFixed(0)}%
                  </span>
                </div>
                <Progress value={ranking.skillMatch} className="h-1.5" />
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex w-full">
            <div className="text-center py-2 border-r border-border flex-1">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-3.5 w-3.5 fill-muted-foreground/60 text-muted-foreground/60" />
                <span className="text-sm font-semibold text-foreground">
                  {photographer.rating.overall}
                </span>
              </div>
              <div className="text-xs text-muted-foreground/80 mt-0.5">
                Rating
              </div>
            </div>
            <Separator orientation="vertical" className="h-1/2 self-center" />
            <div className="text-center py-2 border-r border-border flex-1">
              <div className="flex items-center justify-center gap-1">
                <Briefcase className="h-3.5 w-3.5 fill-muted-foreground/60 text-muted-foreground/60" />
                <span className="text-sm font-semibold text-foreground">
                  {photographer.reliability.totalJobs}
                </span>
              </div>
              <div className="text-xs text-muted-foreground/80 mt-0.5">
                jobs
              </div>
            </div>
            <Separator orientation="vertical" className="h-1/2 self-center" />
            <div className="text-center py-2 flex-1">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 fill-muted-foreground/60 text-muted-foreground/60" />
                <span className="text-sm font-semibold text-foreground">
                  {photographer.reliability.averageDeliveryTime}h
                </span>
              </div>
              <div className="text-xs text-muted-foreground/80 mt-0.5">
                avg delivery
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 p-6">
          {/* Action Button */}
          {onAssign && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="w-full">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssign();
                    }}
                    disabled={!isAvailable}
                    className={`w-full ${
                      recommended ? "bg-emerald-600 " : "bg-primary "
                    } shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {recommended && <Award className="h-4 w-4 mr-2" />}
                    {recommended ? "Assign (Recommended)" : "Assign Photographer"}
                  </Button>
                </span>
              </TooltipTrigger>
              {!isAvailable && (
                <TooltipContent>
                  <P>This photographer is not available for assignment</P>
                </TooltipContent>
              )}
            </Tooltip>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}
