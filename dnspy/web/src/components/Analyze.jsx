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

import { useFile } from "../contexts/FileContext";

// 注册 ChartJS 组件
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Analyze() {
  const { t } = useTranslation();
  const { file, jsonData } = useFile();
  const [selectedRegions, setSelectedRegions] = useState(() => {
    const savedRegions = localStorage.getItem("selectedRegions");
    return savedRegions ? new Set(JSON.parse(savedRegions)) : new Set();
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChart, setSelectedChart] = useState("scores");

  useEffect(() => {
    if (jsonData && selectedRegions.size === 0 && Object.keys(jsonData).length > 0) {
      const firstRegion = jsonData[Object.keys(jsonData)[0]].geocode;
      setSelectedRegions(new Set([firstRegion]));
    }
  }, [jsonData, selectedRegions.size]);

  const availableRegions = useMemo(() => {
    if (!jsonData) return [];
    const regions = new Set();
    Object.values(jsonData).forEach((server) => {
      if (server.geocode && server.geocode.trim() !== "") {
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
      const filtered = labels.map((label, i) => ({ label, value: values[i] })).filter((item) => item.value > 0);
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

    const scoreData = filterNonZero(labels, scores);
    const latencyData = filterNonZero(labels, latencies);
    const successRateData = filterNonZero(labels, successRates);
    const qpsData = filterNonZero(labels, qpsValues);

    return {
      scores: {
        labels: scoreData.labels,
        datasets: [
          {
            label: "总分",
            data: scoreData.values,
            backgroundColor: "rgba(53, 162, 235, 0.5)",
          },
        ],
      },
      latencies: {
        labels: latencyData.labels,
        datasets: [
          {
            label: "平均延迟 (ms)",
            data: latencyData.values,
            backgroundColor: "rgba(255, 99, 132, 0.5)",
          },
        ],
      },
      successRates: {
        labels: successRateData.labels,
        datasets: [
          {
            label: "成功率 (%)",
            data: successRateData.values,
            backgroundColor: "rgba(75, 192, 192, 0.5)",
          },
        ],
      },
      qps: {
        labels: qpsData.labels,
        datasets: [
          {
            label: "QPS",
            data: qpsData.values,
            backgroundColor: "rgba(153, 102, 255, 0.5)",
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
    layout: {
      padding: {
        left: 10,
        right: 10,
        top: 10,
        bottom: 10,
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
      },
      y: {
        beginAtZero: true,
        barThickness: 20,
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
    <div id="analyze" className="p-4 flex flex-col gap-4 h-full">
      <Toaster position="top-center" expand={false} richColors />
      <div className="flex flex-col md:flex-row gap-4 h-full">
        <Card className="w-full md:max-w-[200px] h-full">
          <CardHeader className="font-medium text-lg px-2 py-2">
            <SearchIcon className="w-4 h-4 m-2" />
            {t("tip.region_filter")}
          </CardHeader>
          <CardBody className="px-2 py-2 h-full flex flex-col">
            <div className="flex gap-1 mb-3">
              <button onClick={handleSelectAll} className="flex-1 px-1.5 py-1 text-sm bg-primary text-white rounded-lg">
                {t("button.select_all")}
              </button>
              <button onClick={handleClearAll} className="flex-1 px-1.5 py-1 text-sm bg-default-100 text-default-700 rounded-lg">
                {t("button.clear_all")}
              </button>
            </div>
            <Divider className="my-2 mb-4" />
            <div className="text-sm text-default-500 mb-2">快速筛选</div>
            <div className="flex flex-wrap gap-1 mb-2">
              <Chip
                variant="flat"
                color="default" 
                className="cursor-pointer"
                onClick={() => {
                  const regions = availableRegions.filter(r => r.includes("CN"));
                  setSelectedRegions(new Set(regions));
                }}
              >
                中国节点
              </Chip>
              <Chip
                variant="flat"
                color="default"
                className="cursor-pointer" 
                onClick={() => {
                  const regions = availableRegions.filter(r => r.includes("US"));
                  setSelectedRegions(new Set(regions));
                }}
              >
                美国节点
              </Chip>
              <Chip
                variant="flat"
                color="default"
                className="cursor-pointer"
                onClick={() => {
                  const regions = availableRegions.filter(r => r.includes("JP") || r.includes("KR") || r.includes("SG"));
                  setSelectedRegions(new Set(regions));
                }}
              >
                亚太节点
              </Chip>
              <Chip
                variant="flat"
                color="default"
                className="cursor-pointer"
                onClick={() => {
                  const regions = availableRegions.filter(r => r.includes("EU"));
                  setSelectedRegions(new Set(regions));
                }}
              >
                欧洲节点
              </Chip>
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

            <ScrollShadow className="flex-1">
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
          </CardBody>
        </Card>

        <div className="flex-1 flex flex-col h-full">
          <Tabs selectedKey={selectedChart} onSelectionChange={(key) => setSelectedChart(String(key))} className="mb-4">
            <Tab key="scores" title={t("score.scores")} />
            <Tab key="latencies" title={t("score.latencies")} />
            <Tab key="successRates" title={t("score.successRates")} />
            <Tab key="qps" title={t("score.qps")} />
          </Tabs>

          {selectedRegions.size > 0 ? (
            <Card className="flex-1 h-full">
              <CardHeader>{t(`score.${selectedChart}`)}</CardHeader>
              <CardBody className="h-full">
                <Bar options={options} data={chartData?.[selectedChart] || emptyChartData} />
              </CardBody>
            </Card>
          ) : (
            <div className="flex-1 flex justify-center items-center h-full">
              <p>{t("tip.no_region_selected")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
