// src/utils/side.ts

import type { Lang } from "@/i18n/translations";
import type { Side } from "@/models/device";

const SIDE_LABEL: Record<Lang, Record<Side, string>> = {
  th: { north: "ทิศเหนือ", south: "ทิศใต้" },
  en: { north: "North",  south: "South" },
};

export function sideLabel(lang: Lang, side: Side) {
  return SIDE_LABEL[lang]?.[side] ?? side;
}
