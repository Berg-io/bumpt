import { prisma } from "@/lib/prisma";
import type { VersionCheckResult } from "./types";

export async function checkCsvData(itemName: string): Promise<VersionCheckResult> {
  if (!itemName) return { version: null };

  const entry = await prisma.csvDataEntry.findFirst({
    where: {
      name: {
        equals: itemName,
      },
    },
  });

  return { version: entry?.version ?? null };
}
