import React, { useMemo, useCallback } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Tooltip,
} from "recharts";
import { useChartContext } from "@/context/ChartProvider";
import { useNewContext } from "@/context/NewProvider";
import useRoundState from "@/hooks/vault_v2/states/useRoundState";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import { getDemoRoundId } from "@/lib/demo/utils";
import useChartData from "@/hooks/chart/useChartData";

interface GasPriceChartProps {
  activeLines: { [key: string]: boolean };
}

const GasPriceChart: React.FC<GasPriceChartProps> = ({ activeLines }) => {
  // Protocol context
  const { conn, selectedRound } = useNewContext();
  const { vaultState } = useVaultState();
  const selectedRoundState = useRoundState(vaultState?.currentRoundAddress);

  // Chart context
  const { isExpandedView, setIsExpandedView } = useChartContext();
  // Help context

  const {
    parsedData,
    verticalSegments,
    roundAreas,
    xTicks,
    xTickLabels,
    yMax,
    yTicks,
  } = useChartData(activeLines, vaultState?.address);

  // Strike and cap for all possibly displayed rounds

  //// Hover logic //
  //const isInChartRef = useRef(false);
  //const hoverTimer = useRef<NodeJS.Timeout | null>(null);
  //const clearHoverTimer = () => {
  //  if (hoverTimer.current) {
  //    clearTimeout(hoverTimer.current);
  //    hoverTimer.current = null;
  //  }
  //};

  //const handleMouseMove = useCallback(
  //  (state: any) => {
  //    if (!state?.chartX || !state?.chartY || isHoveringHelpBox) return;

  //    // In chart
  //    isInChartRef.current = true;

  //    // Clear previous timer
  //    if (hoverTimer.current) {
  //      clearTimeout(hoverTimer.current);
  //    }

  //    hoverTimer.current = setTimeout(() => {
  //      if (isInChartRef.current && !isHoveringHelpBox) {
  //        setContent(
  //          `Hovering at chart coords: ${state.chartX}, ${state.chartY}`,
  //        );
  //        setHeader(null);
  //      }
  //    }, HOVER_DELAY);
  //  },
  //  [isHoveringHelpBox],
  //);

  //const handleMouseLeave = useCallback(() => {
  //  isInChartRef.current = false;
  //  clearHoverTimer();
  //}, [clearHoverTimer]);

  // Compute the maximum Y value based on active lines

  // Custom X-axis tick component
  const CustomizedXAxisTick = (props: any) => {
    const { x, y, payload } = props;

    const value = payload.value;

    let label = "";
    let color = "#AAA"; // Default color for timestamps
    const tickInfo = xTickLabels[value];

    // xTick is a round ID label
    if (tickInfo && tickInfo.label) {
      label = tickInfo.label || "";

      if (tickInfo.roundId === selectedRound) {
        color = "#ADA478"; // Color for selected round
      } else {
        color = "#524f44"; // color for other rounds
      }
    }
    // xTick is a timestamp label
    else {
      // Format the timestamp
      const date = new Date(value * 1000);
      const range =
        Number(selectedRoundState?.optionSettleDate) -
        Number(selectedRoundState?.deploymentDate);

      label =
        range < 3600 * 24
          ? date.toLocaleString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
          : date
              .toLocaleString("en-US", {
                month: "short",
                day: "numeric",
              })
              .replace(",", "");
    }

    return (
      <text x={x} y={y + 15} fill={color} fontSize="12" textAnchor="middle">
        {label}
      </text>
    );
  };

  // Format Y-axis ticks
  const yTickFormatter = useCallback((value: number): string => {
    return value.toFixed(1);
  }, []);

  // Handle Loading State
  if (!parsedData || parsedData.length === 0) {
    return (
      <div className="gas-price-chart-loading w-[100%] h-[665px] bg-black-alt rounded-[12px] flex flex-col items-center justify-center">
        Loading...
      </div>
    );
  }

  const animationDuration = 500;
  const isAnimationActive = !isExpandedView;

  return (
    <ResponsiveContainer
      width="100%"
      maxHeight={665}
      className="pr-4 gas-price-chart-container"
    >
      <ComposedChart
        margin={{ left: -20 }}
        data={parsedData}
        syncId="roundChart"
        //        onMouseMove={handleMouseMove}
        //        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="capLevelGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--success-700)"
              stopOpacity={0.2}
            />
            <stop
              offset="100%"
              stopColor="var(--success-700)"
              stopOpacity={0}
            />
          </linearGradient>
          <linearGradient id="basefeeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--greyscale-600)"
              stopOpacity={0.2}
            />
            <stop
              offset="100%"
              stopColor="var(--greyscale-600)"
              stopOpacity={0}
            />
          </linearGradient>
          <linearGradient id="strikeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--warning-300)"
              stopOpacity={0.2}
            />
            <stop
              offset="100%"
              stopColor="var(--success-300)"
              stopOpacity={0}
            />
          </linearGradient>
          <linearGradient id="twapGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#333"
          horizontal={false}
          syncWithTicks={true}
        />
        <XAxis
          dataKey="timestamp"
          domain={["dataMin", "dataMax"]}
          type="number"
          scale="time"
          stroke="#666"
          ticks={xTicks}
          tickLine={false}
          tick={<CustomizedXAxisTick />}
        />
        <YAxis
          type="number"
          domain={[0, yMax]}
          stroke="#666"
          tickFormatter={yTickFormatter}
          ticks={yTicks}
          tickLine={false}
          allowDataOverflow={false}
          tick={{ fill: "#AAA", fontSize: 12 }}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{
            stroke: "#ADA478",
            strokeWidth: 2,
            strokeDasharray: "5 5",
          }}
        />

        {activeLines.TWAP && (
          <>
            <Area
              height={400}
              type="monotone"
              className="chart-area-twap"
              dataKey="confirmedTwap"
              stroke="var(--error-300)"
              strokeWidth={2}
              fill="url(#twapGradient)"
              fillOpacity={1}
              connectNulls={true}
              dot={false}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
            />
            <Line
              style={{
                strokeDasharray: "1 0 1",
              }}
              className="chart-area-twap"
              height={400}
              type="monotone"
              dataKey="unconfirmedTwap"
              //stroke="var(--error-300)"
              stroke="#E69EB1"
              strokeWidth={2}
              //strokeDasharray="1 0 1"
              //fill="url(#twapGradient)"
              fillOpacity={1}
              connectNulls={true}
              dot={false}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
            />
          </>
        )}
        {activeLines.BASEFEE && (
          <>
            <Area
              type="monotone"
              className="chart-area-basefee"
              dataKey="confirmedBasefee"
              stroke="var(--greyscale)"
              strokeWidth={0.5}
              fill="url(#basefeeGradient)"
              fillOpacity={1}
              connectNulls={true}
              dot={false}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
            />
            <Line
              style={{
                strokeDasharray: "1 0 1",
              }}
              type="monotone"
              className="chart-area-basefee"
              dataKey="unconfirmedBasefee"
              stroke="#8B8460"
              strokeWidth={0.5}
              activeDot={true}
              dot={false}
              fill="url(#basefeeGradient)"
              connectNulls={false}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
            />
          </>
        )}
        {activeLines.STRIKE && (
          <Line
            type="monotone"
            dataKey="STRIKE"
            stroke="var(--warning-300)"
            strokeWidth={2}
            activeDot={true}
            dot={false}
            fill="url(#strikeGradient)"
            connectNulls={false}
            isAnimationActive={isAnimationActive}
            animationDuration={animationDuration}
          />
        )}
        {activeLines.CAP_LEVEL && (
          <Area
            type="monotone"
            dataKey="CAP_LEVEL"
            stroke="var(--success)"
            strokeWidth={2}
            label="Cap Level"
            activeDot={true}
            dot={false}
            fill="url(#capLevelGradient)"
            connectNulls={false}
            isAnimationActive={isAnimationActive}
            animationDuration={animationDuration}
          />
        )}
        {
          // Round boundary lines (in expanded view)
          verticalSegments.map((segmentObj: any, index: any) => {
            return (
              <ReferenceLine
                key={`line-${index}`}
                segment={segmentObj.segment}
                stroke={
                  segmentObj.roundId === selectedRound ? "#ADA478" : "#524F44"
                }
                strokeWidth={2}
              />
            );
          })
        }
        {
          // Round boundary areas (in expanded view)
          roundAreas.map((area: any, index: number) => (
            <ReferenceArea
              key={`area-${index}`}
              x1={area.x1}
              x2={area.x2}
              y1={area.y1}
              y2={area.y2}
              stroke={
                activeLines.CAP_LEVEL
                  ? "none"
                  : area.roundId ===
                      (conn === "demo"
                        ? getDemoRoundId(selectedRound)
                        : selectedRound)
                    ? "#ADA478"
                    : "#524F44"
              }
              fillOpacity={
                area.roundId ===
                (conn === "demo"
                  ? getDemoRoundId(selectedRound)
                  : selectedRound)
                  ? 0.07
                  : 0.03
              }
              strokeWidth={2}
              onClick={() => {
                setIsExpandedView(false);
              }}
              style={{ cursor: "pointer" }}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
            />
          ))
        }
      </ComposedChart>
    </ResponsiveContainer>
  );
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const date = new Date(Number(label) * 1000);
    const dateString = date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Create a map to keep track of unique dataKeys
    const uniqueData = new Map<string, any>();
    payload.forEach((entry: any) => {
      if (!uniqueData.has(entry.name)) {
        uniqueData.set(entry.name, entry);
      }
    });

    return (
      <div className="bg-[#1E1E1E] p-4 rounded-lg shadow-lg">
        <p className="text-white text-sm mb-2">{dateString}</p>
        <div className="space-y-2">
          {Array.from(uniqueData.values()).map((entry: any, index: any) => (
            <div className="space-y-2" key={index}>
              {entry?.name === "basefee" ? (
                <div className="flex items-center">
                  <div
                    className="w-4 h-4 rounded-full mr-2 flex flex-col"
                    style={{ backgroundColor: entry?.color }}
                  ></div>
                  <p className="text-white text-sm">PENDING BLOCK</p>
                </div>
              ) : (
                <></>
              )}

              <div className="flex items-center">
                <div
                  className="w-4 h-4 rounded-full mr-2 flex flex-col"
                  style={{ backgroundColor: entry?.color }}
                ></div>
                <p className="text-white text-sm">
                  {entry?.name?.includes("Basefee")
                    ? "BASEFEE"
                    : entry?.name?.includes("Twap")
                      ? "TWAP"
                      : entry?.name.replace("_", " ")}
                  {": "}
                  {entry?.value !== undefined
                    ? Number(entry?.value).toFixed(2)
                    : "N/A"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default GasPriceChart;
