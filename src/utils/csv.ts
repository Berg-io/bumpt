function escapeCsvValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportToCsv(
  rows: any[],
  columns: { key: string; label: string }[],
  filename: string
) {
  const header = columns.map((c) => escapeCsvValue(c.label)).join(",");
  const body = rows
    .map((row: Record<string, unknown>) =>
      columns
        .map((c) => escapeCsvValue(String(row[c.key] ?? "")))
        .join(",")
    )
    .join("\n");

  const bom = "\uFEFF";
  const blob = new Blob([bom + header + "\n" + body], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function parseCsvFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string).replace(/^\uFEFF/, "");
        const lines = parseCsvLines(text);
        if (lines.length < 2) {
          reject(new Error("CSV file is empty or has no data rows"));
          return;
        }

        const headers = lines[0];
        const rows = lines.slice(1).map((values) => {
          const row: Record<string, string> = {};
          headers.forEach((h, i) => {
            row[h.trim()] = (values[i] ?? "").trim();
          });
          return row;
        });

        resolve(rows);
      } catch {
        reject(new Error("Failed to parse CSV file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file, "utf-8");
  });
}

function parseCsvLines(text: string): string[][] {
  const lines: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        current.push(field);
        field = "";
        if (current.some((v) => v !== "")) lines.push(current);
        current = [];
      } else {
        field += ch;
      }
    }
  }

  current.push(field);
  if (current.some((v) => v !== "")) lines.push(current);

  return lines;
}
