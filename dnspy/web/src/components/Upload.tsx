import { Tooltip, Button } from "@nextui-org/react";
import { useTranslation } from "react-i18next";

export default function Upload() {
  const { t } = useTranslation();
  
  return (
    <Tooltip content={t("tip_upload_test_data")}>
      <Button color="primary" variant="shadow">
        {t("upload_test_data")}
      </Button>
    </Tooltip>
  );
}
