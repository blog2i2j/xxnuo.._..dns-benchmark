import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Listbox,
  ListboxSection,
  ListboxItem,
  ScrollShadow,
  Chip,
  SelectSection,
  Tabs,
  Tab,
  Divider,
} from "@nextui-org/react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
import { Toaster, toast } from "sonner";

import { FaSearch as SearchIcon } from "react-icons/fa";
import { IoIosArrowUp as ArrowUpIcon } from "react-icons/io";

import { useFile } from "../contexts/FileContext";

// 注册 ChartJS 组件
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// 添加区域常量配置
const REGION_GROUPS = {
  ASIA: {
    name: "亚太",
    regions: ["CN", "HK", "TW", "JP", "KR", "SG", "ID", "MY", "TH", "VN", "IN", "AU", "NZ", "BD", "AE"],
  },
  AMERICAS: {
    name: "美洲",
    regions: ["US", "CA", "BR", "MX", "AR", "CL"],
  },
  EUROPE: {
    name: "欧洲",
    regions: [
      "EU", "DE", "FR", "GB", "IT", "ES", "NL", "SE", "CH", "PL", "RU",
      "CZ", "CY", "RO", "NO", "FI", "SI", "IE", "LV", "HU", "TR", "MD",
      "LU", "BG", "EE", "AT", "IL"
    ],
  },
  CHINA: {
    name: "中国",
    regions: ["CN", "HK", "TW", "MO"],
  },
  GLOBAL: {
    name: "全球",
    regions: ["CDN", "CLOUDFLARE", "GOOGLE", "AKAMAI", "FASTLY"],
  }
};

export default function Analyze() {
  const { t } = useTranslation();
  const { file, jsonData } = useFile();
  const [selectedRegions, setSelectedRegions] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChart, setSelectedChart] = useState("scores");

  useEffect(() => {
    if (jsonData && Object.keys(jsonData).length > 0) {
      const regions = new Set();
      Object.values(jsonData).forEach((server) => {
        if (server.geocode && server.geocode.trim() !== "") {
          regions.add(server.geocode);
        }
      });
      setSelectedRegions(regions);
    }
  }, [jsonData]);

  const availableRegions = useMemo(() => {
    if (!jsonData) return [];
    const regions = new Set();
    Object.values(jsonData).forEach((server) => {
      if (server.geocode && server.geocode.trim() !== "" && server.score.total > 0) {
        regions.add(server.geocode);
      }
    });
    return Array.from(regions);
  }, [jsonData]);

  const filteredData = useMemo(() => {
    if (!jsonData) return {};
    const filtered = {};
    Object.entries(jsonData).forEach(([server, data]) => {
      if (selectedRegions.has(data.geocode) && data.score.total > 0) {
        filtered[server] = data;
      }
    });
    return filtered;
  }, [jsonData, selectedRegions]);

  const emptyChartData = {
    labels: [],
    datasets: [
      {
        label: "",
        data: [],
        backgroundColor: "",
      },
    ],
  };

  const chartData = useMemo(() => {
    if (selectedRegions.size === 0 || Object.keys(filteredData).length === 0) return emptyChartData;

    const filterNonZero = (labels, values) => {
      const filtered = labels.map((label, i) => ({ label, value: values[i] }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value);
      return {
        labels: filtered.map((item) => item.label),
        values: filtered.map((item) => item.value),
      };
    };

    const labels = Object.keys(filteredData);
    const scores = labels.map((server) => filteredData[server].score.total);
    const latencies = labels.map((server) => filteredData[server].latencyStats.meanMs);
    const successRates = labels.map((server) => filteredData[server].score.successRate);
    const qpsValues = labels.map((server) => filteredData[server].queriesPerSecond);

    const filterLatency = (labels, values) => {
      const filtered = labels.map((label, i) => ({ label, value: values[i] }))
        .filter((item) => item.value > 0)
        .sort((a, b) => a.value - b.value);
      return {
        labels: filtered.map((item) => item.label),
        values: filtered.map((item) => item.value),
      };
    };

    const scoreData = filterNonZero(labels, scores);
    const latencyData = filterLatency(labels, latencies);
    const successRateData = filterNonZero(labels, successRates);
    const qpsData = filterNonZero(labels, qpsValues);

    const getRandomColor = () => {
      const hue = Math.random() * 360;
      return `hsla(${hue}, 70%, 65%, 0.6)`;
    };

    return {
      scores: {
        labels: scoreData.labels,
        datasets: [
          {
            label: "总分",
            data: scoreData.values,
            backgroundColor: getRandomColor(),
          },
        ],
      },
      latencies: {
        labels: latencyData.labels,
        datasets: [
          {
            label: "平均延迟 (ms)",
            data: latencyData.values,
            backgroundColor: getRandomColor(),
          },
        ],
      },
      successRates: {
        labels: successRateData.labels,
        datasets: [
          {
            label: "成功率 (%)",
            data: successRateData.values,
            backgroundColor: getRandomColor(),
          },
        ],
      },
      qps: {
        labels: qpsData.labels,
        datasets: [
          {
            label: "QPS",
            data: qpsData.values,
            backgroundColor: getRandomColor(),
          },
        ],
      },
    };
  }, [filteredData, selectedRegions]);

  const options = {
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const value = context.raw;
            const label = context.dataset.label;
            const server = context.label;
            return `${label}: ${value}`;
          },
        },
      },
    },
    responsive: true,
    indexAxis: "y",
    onClick: (event, elements, chart) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const server = chart.data.labels[index];
        navigator.clipboard.writeText(server).then(() => {
          toast.success(t("tip.copied"), {
            description: server,
            duration: 2000,
          });
        });
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
      },
      y: {
        beginAtZero: true,
        barThickness: (context) => {
          const dataLength = context.chart.data.labels.length;
          const calculatedHeight = Math.min(40, Math.max(20, 600 / dataLength));
          return calculatedHeight;
        }
      },
    },
  };

  const filteredRegions = useMemo(
    () => availableRegions.filter((region) => region.toLowerCase().includes(searchQuery.toLowerCase())),
    [availableRegions, searchQuery]
  );

  const handleSelectAll = () => {
    setSelectedRegions(new Set(availableRegions));
  };

  const handleClearAll = () => {
    setSelectedRegions(new Set());
  };

  const selectedContent = useMemo(() => {
    if (selectedRegions.size === 0) {
      return null;
    }

    return (
      <ScrollShadow hideScrollBar className="w-full flex py-0.5 px-2 gap-1" orientation="horizontal">
        {Array.from(selectedRegions).map((region) => (
          <Chip key={region} onClose={() => handleRegionToggle(region, false)} variant="flat" size="sm">
            {region}
          </Chip>
        ))}
      </ScrollShadow>
    );
  }, [selectedRegions]);

  const handleRegionToggle = (region, checked) => {
    const newSelected = new Set(selectedRegions);
    if (checked) {
      newSelected.add(region);
    } else {
      newSelected.delete(region);
    }
    setSelectedRegions(newSelected);
  };

  // 添加动态高度计算
  const chartHeight = useMemo(() => {
    if (!chartData?.[selectedChart]?.labels?.length) return 200; // 默认最小高度
    const dataLength = chartData[selectedChart].labels.length;
    // 每个柱状图项目高度 30px + 上下 padding 40px + 顶部标题和图例 60px
    return dataLength * 20 + 100;
  }, [chartData, selectedChart]);

  // 修改按钮样式，添加 fixed 定位
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!file && !jsonData) {
    return (
      <div id="analyze" className="p-4 flex justify-center">
        <Card isBlurred>
          <CardBody className="text-center">
            <p>{t("tip.please_upload_file")}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div id="analyze" className="p-4 flex flex-col gap-4">
      <Toaster position="top-center" expand={false} richColors />
      <div className="flex flex-col md:flex-row gap-4">
        <Card className="w-full md:w-[180px] shrink-0">
          <CardHeader className="font-medium text-lg px-2 py-2">
            <SearchIcon className="w-4 h-4 m-2" />
            {t("tip.region_filter")}
          </CardHeader>
          <CardBody className="px-2 py-2 h-full flex flex-col relative">

            <div className="text-sm text-default-500 mb-2">快速筛选</div>
            <div className="flex flex-wrap gap-1 mb-2">
              {Object.entries(REGION_GROUPS).map(([key, group]) => (
                <Chip
                  key={key}
                  variant="flat"
                  color="default"
                  className="cursor-pointer"
                  onClick={() => {
                    const regions = availableRegions.filter(r =>
                      group.regions.some(code => r.toUpperCase().includes(code)) ||
                      REGION_GROUPS.GLOBAL.regions.some(code => r.toUpperCase().includes(code))
                    );
                    setSelectedRegions(new Set(regions));
                  }}
                >
                  {group.name}
                </Chip>
              ))}
            </div>
            <Divider className="my-2 mb-4" />
            <div className="text-sm text-default-500 mb-2">手动选择</div>

            <Input
              placeholder={t("tip.search_region")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startContent={<SearchIcon className="w-4 h-4" />}
              className="w-full mb-4"
            />
            <div className="flex gap-1 mb-3">
              <button onClick={handleSelectAll} className="flex-1 px-1.5 py-1 text-sm bg-primary text-white rounded-lg">
                {t("button.select_all")}
              </button>
              <button onClick={handleClearAll} className="flex-1 px-1.5 py-1 text-sm bg-default-100 text-default-700 rounded-lg">
                {t("button.clear_all")}
              </button>
            </div>
            <Divider className="my-2 mb-4" />

            <ScrollShadow id="region-scroll-container" className="flex-1">
              <div className="flex flex-wrap gap-1">
                {filteredRegions.map((region) => (
                  <Chip
                    key={region}
                    variant={selectedRegions.has(region) ? "solid" : "flat"}
                    color={selectedRegions.has(region) ? "primary" : "default"}
                    className="cursor-pointer"
                    onClick={() => handleRegionToggle(region, !selectedRegions.has(region))}
                  >
                    {region}
                  </Chip>
                ))}
              </div>
            </ScrollShadow>

            <button
              onClick={handleScrollToTop}
              className="fixed bottom-4 right-4 p-2 bg-default-100 rounded-full hover:bg-default-200 transition-colors z-10 shadow-lg"
              aria-label="回到顶部"
            >
              <ArrowUpIcon className="w-5 h-5" />
            </button>
          </CardBody>
        </Card>

        <div className="flex-1 flex flex-col min-w-0">
          <Tabs selectedKey={selectedChart} onSelectionChange={(key) => setSelectedChart(String(key))} className="mb-4">
            <Tab key="scores" title={t("score.scores")} />
            <Tab key="latencies" title={t("score.latencies")} />
            <Tab key="successRates" title={t("score.successRates")} />
            <Tab key="qps" title={t("score.qps")} />
          </Tabs>

          {selectedRegions.size > 0 ? (
            <Card className="flex-1">
              <CardHeader className="py-2">{t(`score.${selectedChart}`)}</CardHeader>
              {/* 使用动态计算的高度 */}
              <CardBody style={{ height: `${chartHeight}px` }}>
                <Bar
                  options={{
                    ...options,
                    maintainAspectRatio: false,
                    layout: {
                      padding: {
                        left: 20,
                        right: 30,
                        top: 20,
                        bottom: 20,
                      }
                    },
                  }}
                  data={chartData?.[selectedChart] || emptyChartData}
                />
              </CardBody>
            </Card>
          ) : (
            <div className="flex justify-center items-center p-8">
              <p>{t("tip.no_region_selected")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
