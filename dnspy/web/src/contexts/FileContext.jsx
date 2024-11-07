import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const FileContext = createContext();

export function FileProvider({ children }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const hasShownInitialToast = useRef(false);
  const [jsonData, setJsonData] = useState(() => {
    const savedData = localStorage.getItem("dnsAnalyzerData");
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        if (!hasShownInitialToast.current) {
          setTimeout(() => {
            toast.success(t("tip.data_loaded"), {
              description: t("tip.data_loaded_desc"),
              duration: 2000,
              className: "dark:text-neutral-200",
            });
          }, 0);
          hasShownInitialToast.current = true;
        }
        return data;
      } catch (error) {
        console.error("解析保存的JSON时出错:", error);
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (jsonData) {
      localStorage.setItem("dnsAnalyzerData", JSON.stringify(jsonData));
    }
  }, [jsonData]);

  useEffect(() => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result);
        setJsonData(data);

        toast.success(t("tip.data_loaded"), {
          description: t("tip.data_loaded_desc"),
          duration: 2000,
          className: "dark:text-neutral-200",
        });
      } catch (error) {
        console.error("解析JSON时出错:", error);
        toast.error(t("tip.data_load_failed"), {
          description: t("tip.data_load_failed_desc"),
          duration: 3000,
          className: "dark:text-neutral-200",
        });
      }
    };
    reader.readAsText(file);
  }, [file, t]);

  return <FileContext.Provider value={{ file, setFile, jsonData, setJsonData }}>{children}</FileContext.Provider>;
}

export function useFile() {
  const context = useContext(FileContext);
  if (context === undefined) {
    throw new Error("useFile必须在FileProvider中使用");
  }
  return context;
}
