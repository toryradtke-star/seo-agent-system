import fs from "node:fs/promises";
import path from "node:path";

export async function exportToFiles(pageData, options = {}) {
  const baseOutputDir = path.resolve(options.outputDir || "output/wp-page-builder");
  const slug = slugify(`${pageData.pageType}-${pageData.topic}`);
  const artifactDir = path.join(baseOutputDir, slug);

  await fs.mkdir(artifactDir, { recursive: true });

  const files = {
    html: path.join(artifactDir, "page.html"),
    css: path.join(artifactDir, "page.css"),
    blueprint: path.join(artifactDir, "blueprint.json"),
    sections: path.join(artifactDir, "sections.json"),
    artifact: path.join(artifactDir, "artifact.json"),
    manifest: path.join(artifactDir, "manifest.json")
  };

  const manifest = {
    pageType: pageData.pageType,
    topic: pageData.topic,
    generatedAt: new Date().toISOString(),
    files: {
      html: "page.html",
      css: "page.css",
      blueprint: "blueprint.json",
      sections: "sections.json",
      artifact: "artifact.json",
      manifest: "manifest.json"
    }
  };

  await Promise.all([
    fs.writeFile(files.html, pageData.fullPageHtml, "utf8"),
    fs.writeFile(files.css, pageData.globalCSS || pageData.css, "utf8"),
    fs.writeFile(files.blueprint, JSON.stringify(pageData.blueprint, null, 2), "utf8"),
    fs.writeFile(files.sections, JSON.stringify(pageData.sections || [], null, 2), "utf8"),
    fs.writeFile(
      files.artifact,
      JSON.stringify(
        {
          pageType: pageData.pageType,
          topic: pageData.topic,
          seo: pageData.seo,
          blueprint: pageData.blueprint,
          sections: pageData.sections || [],
          globalCSS: pageData.globalCSS || pageData.css,
          html: pageData.html,
          css: pageData.globalCSS || pageData.css
        },
        null,
        2
      ),
      "utf8"
    ),
    fs.writeFile(files.manifest, JSON.stringify(manifest, null, 2), "utf8"),
    updateOutputIndex(baseOutputDir, {
      slug,
      pageType: pageData.pageType,
      topic: pageData.topic,
      artifactDir,
      sectionCount: pageData.sections?.length || 0,
      generatedAt: manifest.generatedAt
    })
  ]);

  console.log("Page artifacts written:");
  console.log(artifactDir);

  return { mode: "files", artifactDir, files };
}

function slugify(value) {
  return String(value || "page")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function updateOutputIndex(baseOutputDir, entry) {
  const indexPath = path.join(baseOutputDir, "index.json");
  const latestPath = path.join(baseOutputDir, "latest.json");

  let existing = [];
  try {
    existing = JSON.parse(await fs.readFile(indexPath, "utf8"));
    if (!Array.isArray(existing)) {
      existing = [];
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const next = [entry, ...existing.filter((item) => item.slug !== entry.slug)].slice(0, 50);

  await Promise.all([
    fs.writeFile(indexPath, JSON.stringify(next, null, 2), "utf8"),
    fs.writeFile(latestPath, JSON.stringify(entry, null, 2), "utf8")
  ]);
}
