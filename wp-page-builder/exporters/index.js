import { exportPageToDrive } from "../integrations/googleDriveExporter.js";
import { exportToConsole } from "./consoleExporter.js";
import { exportToFiles } from "./fileExporter.js";

const defaultExporters = {
  console: exportToConsole,
  files: exportToFiles,
  drive: async (pageData) =>
    exportPageToDrive({
      pageType: pageData.pageType,
      topic: pageData.topic,
      title: `${pageData.topic} ${capitalize(pageData.pageType)} Page`,
      blueprint: pageData.blueprint,
      sections: pageData.sections || [],
      globalCSS: pageData.globalCSS || pageData.css || "",
      html: pageData.html,
      css: pageData.css
    })
};

export async function exportGeneratedPage(pageData, options = {}) {
  const modes = options.modes?.length ? options.modes : ["console"];
  const exporters = { ...defaultExporters, ...(options.exporters || {}) };
  const results = [];

  for (const mode of modes) {
    const exporter = exporters[mode];
    if (!exporter) {
      throw new Error(`Unsupported export mode: ${mode}`);
    }

    const result = await exporter(pageData, options);
    results.push(result);
  }

  return results;
}

export function getDefaultExporters() {
  return { ...defaultExporters };
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}
