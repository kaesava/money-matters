import { useMemo } from "react";
import type { QuickActionInitialData } from "@money-matters/types";

export function useQuickInitialMatching(
  initialData: QuickActionInitialData | undefined,
  categories: Array<{ id: string; name: string }>,
  categoryId: string,
  setCategoryId: (id: string) => void,
  sourceCategoryId: string,
  setSourceCategoryId: (id: string) => void,
  destinationCategoryId: string,
  setDestinationCategoryId: (id: string) => void
) {
  useMemo(() => {
    if (!initialData || categories.length === 0) return;

    if (initialData.envelopeName && !categoryId) {
      const search = initialData.envelopeName.toLowerCase().trim();
      const matched = categories.find(
        (c) => c.name.toLowerCase().includes(search) || search.includes(c.name.toLowerCase())
      );
      if (matched) {
        setCategoryId(matched.id);
      }
    }

    if (initialData.sourcePoolName && !sourceCategoryId) {
      const search = initialData.sourcePoolName.toLowerCase().trim();
      const matched = categories.find(
        (c) => c.name.toLowerCase().includes(search) || search.includes(c.name.toLowerCase())
      );
      if (matched) {
        setSourceCategoryId(matched.id);
      }
    }

    if (initialData.destinationPoolName && !destinationCategoryId) {
      const search = initialData.destinationPoolName.toLowerCase().trim();
      const matched = categories.find(
        (c) => c.name.toLowerCase().includes(search) || search.includes(c.name.toLowerCase())
      );
      if (matched) {
        setDestinationCategoryId(matched.id);
      }
    }
  }, [
    initialData,
    categories,
    categoryId,
    sourceCategoryId,
    destinationCategoryId,
    setCategoryId,
    setSourceCategoryId,
    setDestinationCategoryId,
  ]);
}
