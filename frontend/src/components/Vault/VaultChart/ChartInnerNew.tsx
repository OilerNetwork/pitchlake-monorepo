import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import useChartData from "@/hooks/chart/useChartData";
import useVaultState from "@/hooks/vault/states/useVaultState";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ChartInnerNewProps {
  activeLines?: { [key: string]: boolean };
  vaultAddress?: string;
}

const ChartInnerNew = ({ activeLines, vaultAddress }: ChartInnerNewProps) => {
  // Step 2: Get real data from useChartData hook
  const { vaultState } = useVaultState();
  const { parsedData } = useChartData(activeLines || {}, vaultState?.address);
  
  
  // Fallback to test data if no real data
  const testData = {
    labels: ['1759984131', '1759984140', '1759984200'],
    datasets: [
      {
        label: 'Base Fee',
        data: [1, 2, 1.5],
        borderColor: 'rgb(136, 132, 216)',
        backgroundColor: 'rgba(136, 132, 216, 0.2)',
        tension: 0.1,
      },
      {
        label: 'TWAP',
        data: [2, 3, 2.5],
        borderColor: 'rgb(130, 202, 157)',
        backgroundColor: 'rgba(130, 202, 157, 0.2)',
        tension: 0.1,
      },
    ],
  };

  // Step 3: Convert parsedData to Chart.js format with activeLines support and timestamp formatting
  const chartData = parsedData && parsedData.length > 0 ? {
    labels: parsedData.map((item: any) => {
      // Convert timestamp to HH:mm format
      const date = new Date(item.timestamp * 1000);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    }),
    datasets: [
      // Only show datasets for active lines with app color scheme
      ...(activeLines?.BASEFEE ? [{
        label: 'Base Fee',
        data: parsedData.map((item: any) => {
          return item.confirmedBasefee || item.basefee || item.BASEFEE || 0;
        }),
        borderColor: '#8B8460', // App's basefee color
        backgroundColor: 'rgba(139, 132, 96, 0.1)',
        tension: 0.1,
        borderWidth: 0.5,
      }] : []),
      ...(activeLines?.TWAP ? [{
        label: 'TWAP',
        data: parsedData.map((item: any) => {
          return item.confirmedTwap || item.twap || item.TWAP || 0;
        }),
        borderColor: '#E69EB1', // App's TWAP color
        backgroundColor: 'rgba(230, 158, 177, 0.1)',
        tension: 0.1,
        borderWidth: 2,
      }] : []),
      ...(activeLines?.STRIKE ? [{
        label: 'Strike',
        data: parsedData.map((item: any) => item.STRIKE || 0),
        borderColor: '#ADA478', // App's warning color
        backgroundColor: 'rgba(173, 164, 120, 0.1)',
        tension: 0.1,
        borderWidth: 2,
      }] : []),
      ...(activeLines?.CAP_LEVEL ? [{
        label: 'Cap Level',
        data: parsedData.map((item: any) => item.CAP_LEVEL || 0),
        borderColor: '#22C55E', // App's success color
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.1,
        borderWidth: 2,
      }] : []),
    ],
  } : testData;

  // Custom tooltip component
  const customTooltip = (context: any) => {
    const { chart, tooltip } = context;
    const { dataPoints } = tooltip;
    
    if (!dataPoints || dataPoints.length === 0) return null;
    
    const dataPoint = dataPoints[0];
    const timestamp = chart.data.labels[dataPoint.dataIndex];
    const originalData = parsedData[dataPoint.dataIndex];
    
    // Create tooltip content
    const tooltipContent = document.createElement('div');
    tooltipContent.style.cssText = `
      background: #1E1E1E;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      min-width: 200px;
    `;
    
    // Add timestamp
    const timeDiv = document.createElement('div');
    timeDiv.style.cssText = 'margin-bottom: 8px; font-weight: 600; color: #ADA478;';
    timeDiv.textContent = timestamp;
    tooltipContent.appendChild(timeDiv);
    
    // Add data points
    dataPoints.forEach((point: any) => {
      const dataDiv = document.createElement('div');
      dataDiv.style.cssText = 'display: flex; align-items: center; margin-bottom: 4px;';
      
      const colorDiv = document.createElement('div');
      colorDiv.style.cssText = `
        width: 12px;
        height: 12px;
        background-color: ${point.dataset.borderColor};
        border-radius: 2px;
        margin-right: 8px;
      `;
      
      const labelDiv = document.createElement('div');
      labelDiv.textContent = `${point.dataset.label}: ${Number(point.parsed.y).toFixed(2)} Gwei`;
      
      dataDiv.appendChild(colorDiv);
      dataDiv.appendChild(labelDiv);
      tooltipContent.appendChild(dataDiv);
    });
    
    return tooltipContent;
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart' as const,
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#AAA', // Light gray text for legend
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: false, // Hide title for cleaner look
      },
      tooltip: {
        enabled: true,
        external: customTooltip,
        intersect: false,
        mode: 'index' as const,
        animation: {
          duration: 200,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#AAA', // Light gray for x-axis labels
          maxTicksLimit: 8, // Limit number of time labels
          font: {
            size: 11,
          },
        },
        grid: {
          color: '#333', // Dark grid lines
          drawBorder: false,
          lineWidth: 1,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#AAA', // Light gray for y-axis labels
          font: {
            size: 11,
          },
          callback: function(value: any) {
            return Number(value).toFixed(1) + ' Gwei';
          },
        },
        grid: {
          color: '#333', // Dark grid lines
          drawBorder: false,
          lineWidth: 1,
        },
      },
    },
    elements: {
      point: {
        radius: 0, // Hide points for cleaner lines
        hoverRadius: 6,
        hoverBorderWidth: 2,
        hoverBorderColor: '#fff',
      },
      line: {
        borderWidth: 2,
        tension: 0.1,
      },
    },
  };

  // Loading state
  if (!parsedData) {
    return (
      <div className="w-full h-[665px] bg-black-alt rounded-[12px] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ADA478"></div>
          <div className="text-white text-lg">Loading chart data...</div>
        </div>
      </div>
    );
  }

  // Empty data state
  if (parsedData.length === 0) {
    return (
      <div className="w-full h-[665px] bg-black-alt rounded-[12px] flex items-center justify-center">
        <div className="text-white text-lg text-center">
          <div className="mb-2">📊</div>
          <div>No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[665px] bg-black-alt rounded-[12px] p-4 relative">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default ChartInnerNew;
