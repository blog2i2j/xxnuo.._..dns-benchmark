import { Tooltip, Button } from "@nextui-org/react";
import { useTranslation } from "react-i18next";
import { useFile } from "../contexts/FileContext";

export default function Upload() {
  const { t } = useTranslation();
  const { setFile } = useFile();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFile(file);
    }
  };

  return (
    <Tooltip content={t("tip_upload_test_data")}>
      <Button color="primary" variant="shadow" as="label" className="cursor-pointer">
        <input type="file" className="hidden" accept=".json" onChange={handleFileChange} />
        {t("upload_test_data")}
      </Button>
    </Tooltip>
  );
}
