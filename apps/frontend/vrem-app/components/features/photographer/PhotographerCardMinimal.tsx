import { useState, useEffect, useRef } from "react";
import { Photographer, PhotographerRanking } from "../../../types";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Badge } from "../../ui/badge";
import { Progress } from "../../ui/progress";
import { Button } from "../../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import {
  Star,
  MapPin,
  Award,
  Building2,
  Heart,
  Briefcase,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getLocationDisplay } from "../../../lib/utils";
import { ChartContainer, ChartConfig } from "../../ui/chart";
import {
  RadialBarChart,
  RadialBar,
  PolarGrid,
  PolarRadiusAxis,
  Label,
} from "recharts";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { P } from "@/components/ui/typography";

interface PhotographerCardMinimalProps {
  photographer: Photographer;
  ranking?: PhotographerRanking["factors"];
  score?: number;
  recommended?: boolean;
  onClick?: () => void;
  onAssign?: () => void;
  selected?: boolean;
  isAssigning?: boolean;
  onCollapse?: () => void;
}

const scoreChartConfig = {
  score: {
    label: "Score",
  },
} satisfies ChartConfig;

export function PhotographerCardMinimal({
  photographer,
  ranking,
  score,
  recommended,
  onClick,
  onAssign,
  selected,
  isAssigning = false,
  onCollapse,
}: PhotographerCardMinimalProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const prevExpandedRef = useRef(isExpanded);
  const isAvailable = ranking ? ranking.availability === 100 : true;

  // Reset map when dropdown collapses (transitions from expanded to collapsed)
  useEffect(() => {
    if (prevExpandedRef.current && !isExpanded && onCollapse) {
      onCollapse();
    }
    prevExpandedRef.current = isExpanded;
  }, [isExpanded, onCollapse]);

  // MapWithSidebar is dispatcher-only, so show full address
  const displayAddress = getLocationDisplay(
    photographer.homeLocation.address,
    true
  );

  const getScoreColor = (s: number) => {
    if (s >= 80) return "hsl(142, 76%, 36%)"; // emerald-600
    if (s >= 60) return "hsl(38, 92%, 50%)"; // amber-500
    return "hsl(0, 84%, 60%)"; // red-500
  };

  const scoreData =
    score !== undefined
      ? [
          {
            name: "score",
            value: score,
            fill: getScoreColor(score),
          },
        ]
      : [];

  const handleClick = () => {
    setIsExpanded(!isExpanded);
    if (onClick) onClick();
  };

  return (
    <div
      className={`relative rounded-lg border transition-all overflow-hidden w-full`}
    >
      {/* Minimal View - Always Visible */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={handleClick}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <Avatar className="size-12 border-2 border-background">
            <AvatarImage src={photographer.avatar} alt={photographer.name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {photographer.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          {/* Status Indicator */}
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${
              isAvailable ? "bg-emerald-500" : "bg-gray-400"
            }`}
          />
        </div>

        {/* Name and Basic Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-medium text-sm truncate">
              {photographer.name}
            </span>
            {recommended && (
              <Award className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs text-foreground">
                {photographer.rating.overall}
              </span>
            </div>
            {ranking && (
              <span className="text-xs text-muted-foreground">
                {ranking.distanceKm.toFixed(1)}km
              </span>
            )}
            {score !== undefined && (
              <Badge variant="outline" className="text-xs h-5 px-1.5">
                {score.toFixed(0)}
              </Badge>
            )}
          </div>
        </div>

        {/* Expand/Collapse Icon */}
        <div className="shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Card className="px-3 pb-3 space-y-4 border-t border-border pt-3 gap-0 rounded-none shadow-none border-x-0 border-b-0 min-w-0">
              {/* Full Details */}
              <CardHeader className="space-y-3 min-w-0 w-full p-0 gap-0">
                {/* Company/Independent Status */}
                {!photographer.isIndependent && photographer.companyName && (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs text-primary">
                      {photographer.companyName}
                    </span>
                  </div>
                )}
                {photographer.isIndependent && (
                  <Badge variant="outline" className="text-xs h-5 w-fit">
                    Independent
                  </Badge>
                )}
                {ranking && ranking.preferredRelationship > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
                    <span className="text-xs text-destructive">
                      Preferred Vendor
                    </span>
                  </div>
                )}
                {/* Address */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 w-full overflow-hidden">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <span className="truncate block w-full">
                      {displayAddress}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-2.5 p-0 gap-0 ">
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
                        {(photographer.reliability.onTimeRate * 100).toFixed(0)}
                        %
                      </span>
                    </div>
                  </div>

                  {/* Skill Match */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">
                          Skill Match
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <P className="text-xs">
                              Calculated by averaging the photographer's skill
                              ratings (1-5 scale) for each media type required
                              by the job. The average is converted to a
                              percentage (multiplied by 20).
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
              <div className="relative flex size-full items-center">
                {/* Score */}
                {score !== undefined && (
                  <>
                    <div className="text-center flex-1">
                      <div className="flex items-center justify-center">
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
                                  <PolarRadiusAxis
                                    tick={false}
                                    tickLine={false}
                                    axisLine={false}
                                  >
                                    <Label
                                      content={({ viewBox }) => {
                                        if (
                                          viewBox &&
                                          "cx" in viewBox &&
                                          "cy" in viewBox
                                        ) {
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
                              Overall match score calculated from availability,
                              distance, skill match, and reliability. Higher
                              scores indicate better fit for the job.
                            </P>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </>
                )}
                <Separator orientation="vertical" className="" />
                {/* Total Jobs */}
                <div className="flex flex-col items-center justify-center flex-1">
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
                <Separator orientation="vertical" className="" />
                {/* Average Delivery Time */}
                <div className="flex flex-col items-center justify-center flex-1">
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
              <CardFooter className="p-0 gap-0">
              {/* Assign Button */}
              {onAssign && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="w-full">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssign();
                        }}
                        disabled={!isAvailable || isAssigning}
                        className={`w-full ${
                          recommended
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-primary"
                        } shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {recommended && <Award className="h-4 w-4 mr-2" />}
                        {recommended
                          ? "Assign (Recommended)"
                          : "Assign Photographer"}
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
        )}
      </AnimatePresence>
      {isAssigning && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg z-10">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-foreground">Assigning...</span>
          </div>
        </div>
      )}
    </div>
  );
}
