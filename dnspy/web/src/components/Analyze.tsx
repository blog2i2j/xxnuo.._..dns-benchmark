import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardBody, Select, SelectItem, Tabs, Tab, Input } from "@nextui-org/react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";

import { FaSearch as SearchIcon } from "react-icons/fa";

import { useFile } from "../contexts/FileContext";

// 注册 ChartJS 组件
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Analyze() {
  const { t } = useTranslation();
  const { file } = useFile();
  const [jsonData, setJsonData] = useState<any>(null);
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (file) {
      console.log("Processing file:", file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          //   console.log("JSON data:", data);
          setJsonData(data);
          // 设置第一个地区为默认选中
          if (data && Object.keys(data).length > 0) {
            const firstRegion = data[Object.keys(data)[0]].geocode;
            setSelectedRegions(new Set([firstRegion]));
          }
        } catch (error) {
          console.error("Error parsing JSON:", error);
        }
      };
      reader.readAsText(file);
    }
  }, [file]);

  // 获取所有可用地区
  const getAvailableRegions = (): string[] => {
    if (!jsonData) return [];
    const regions = new Set<string>();
    Object.values(jsonData).forEach((server: any) => {
      regions.add(server.geocode);
    });
    return Array.from(regions);
  };

  // 根据地区筛选服务器
  const getServersByRegions = () => {
    if (!jsonData) return {};
    const filteredData: any = {};
    Object.entries(jsonData).forEach(([ip, data]: [string, any]) => {
      if (selectedRegions.has(data.geocode)) {
        filteredData[ip] = data;
      }
    });
    return filteredData;
  };

  // 准备图表数据
  const prepareChartData = () => {
    const filteredData = getServersByRegions();
    if (Object.keys(filteredData).length === 0) return null;

    const labels = Object.keys(filteredData);
    const scores = labels.map((ip) => filteredData[ip].score.total);
    const latencies = labels.map((ip) => filteredData[ip].latencyStats.meanMs);

    return {
      scores: {
        labels,
        datasets: [
          {
            label: "总分",
            data: scores,
            backgroundColor: "rgba(53, 162, 235, 0.5)",
          },
        ],
      },
      latencies: {
        labels,
        datasets: [
          {
            label: "平均延迟 (ms)",
            data: latencies,
            backgroundColor: "rgba(255, 99, 132, 0.5)",
          },
        ],
      },
      successRates: {
        labels,
        datasets: [
          {
            label: "成功率 (%)",
            data: labels.map((ip) => filteredData[ip].score.successRate),
            backgroundColor: "rgba(75, 192, 192, 0.5)",
          },
        ],
      },
      qps: {
        labels,
        datasets: [
          {
            label: "QPS",
            data: labels.map((ip) => filteredData[ip].queriesPerSecond),
            backgroundColor: "rgba(153, 102, 255, 0.5)",
          },
        ],
      },
    };
  };

  // 图表配置
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
  };

  // 过滤搜索结果
  const filteredRegions = getAvailableRegions().filter((region) =>
    region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!file) {
    return (
      <div id="analyze" className="p-4 flex justify-center">
        <Card isBlurred>
          <CardBody className="text-center">
            <p>{t("please_upload_file")}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div id="analyze" className="p-4">
      {jsonData && (
        <div className="flex gap-4">
          {/* 左侧地区选择面板 */}
          <div className="w-64 flex-shrink-0">
            <Card className="h-full">
              <CardHeader>地区筛选</CardHeader>
              <CardBody>
                <Input
                  placeholder="搜索地区..."
                  startContent={<SearchIcon />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-4"
                />
                <div className="max-h-[600px] overflow-y-auto">
                  {filteredRegions.map((region) => (
                    <div key={region} className="mb-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedRegions.has(region)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedRegions);
                            if (e.target.checked) {
                              newSelected.add(region);
                            } else {
                              newSelected.delete(region);
                            }
                            setSelectedRegions(newSelected);
                          }}
                          className="mr-2"
                        />
                        {region}
                      </label>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* 右侧图表展示区域 */}
          <div className="flex-grow">
            {/* 数据摘要 */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardBody>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">已选地区数</div>
                    <div className="text-xl font-bold">{selectedRegions.size}</div>
                  </div>
                </CardBody>
              </Card>
              {/* 可以添加更多摘要卡片 */}
            </div>

            {/* 图表标签页 */}
            <Card>
              <CardBody>
                <Tabs>
                  <Tab key="scores" title="总分对比">
                    <Bar options={options} data={prepareChartData()?.scores} />
                  </Tab>
                  <Tab key="latencies" title="延迟对比">
                    <Bar options={options} data={prepareChartData()?.latencies} />
                  </Tab>
                  <Tab key="successRates" title="成功率">
                    <Bar options={options} data={prepareChartData()?.successRates} />
                  </Tab>
                  <Tab key="qps" title="QPS">
                    <Bar options={options} data={prepareChartData()?.qps} />
                  </Tab>
                </Tabs>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
