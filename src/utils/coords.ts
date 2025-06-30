export function toPoints(val: number | string, axis: "x"|"y"|"w"|"h", pageWidth: number, pageHeight: number): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    // Handle unit conversions
    if (val.endsWith("mm")) {
      const mm = parseFloat(val);
      if (isNaN(mm)) throw new Error(`Invalid millimeter value: ${val}`);
      return mm * 2.834645669; // 1mm = 2.834645669pt
    }
    if (val.endsWith("cm")) {
      const cm = parseFloat(val);
      if (isNaN(cm)) throw new Error(`Invalid centimeter value: ${val}`);
      return cm * 28.34645669; // 1cm = 28.34645669pt
    }
    if (val.endsWith("in")) {
      const inches = parseFloat(val);
      if (isNaN(inches)) throw new Error(`Invalid inch value: ${val}`);
      return inches * 72; // 1in = 72pt
    }
    if (val.endsWith("pt")) {
      const points = parseFloat(val);
      if (isNaN(points)) throw new Error(`Invalid point value: ${val}`);
      return points; // Already in points
    }
    if (val.endsWith("px")) {
      const pixels = parseFloat(val);
      if (isNaN(pixels)) throw new Error(`Invalid pixel value: ${val}`);
      return pixels * 0.75; // Assuming 96 DPI: 1px = 0.75pt
    }
    
    // Handle percentages
    if (val.endsWith("%")) {
      const pct = parseFloat(val) / 100;
      if (axis === "x" || axis === "w") return pct * pageWidth;
      return pct * pageHeight;
    }
    
    // Handle special keywords
    if (val === "center") {
      if (axis === "x") return pageWidth / 2;
      if (axis === "y") return pageHeight / 2;
      // Center is not meaningful for width/height axes
      throw new Error(`Unsupported coordinate value "center" for axis ${axis}`);
    }
    
    // Handle string numbers (no units)
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && val === parsed.toString()) {
      return parsed;
    }
  }
  throw new Error(`Unsupported coordinate value: ${val}`);
} 