export function toPoints(val: number | string, axis: "x"|"y"|"w"|"h", pageWidth: number, pageHeight: number): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    if (val.endsWith("%")) {
      const pct = parseFloat(val) / 100;
      if (axis === "x" || axis === "w") return pct * pageWidth;
      return pct * pageHeight;
    }
    if (val === "center") {
      if (axis === "x") return pageWidth / 2;
      if (axis === "y") return pageHeight / 2;
      // Center is not meaningful for width/height axes
      throw new Error(`Unsupported coordinate value "center" for axis ${axis}`);
    }
    // Handle string numbers
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && val === parsed.toString()) {
      return parsed;
    }
  }
  throw new Error(`Unsupported coordinate value: ${val}`);
} 