export function partitionCss(sectionHtml = "", globalCss = "") {
  const classNames = extractClassNames(sectionHtml);
  if (classNames.size === 0 || !globalCss.trim()) {
    return "";
  }

  const blocks = parseTopLevelBlocks(globalCss);
  const matchedBlocks = blocks
    .map((block) => filterBlock(block, classNames))
    .filter(Boolean);

  return matchedBlocks.join("\n\n").trim();
}

export function extractClassNames(sectionHtml = "") {
  const classNames = new Set();
  const classMatches = sectionHtml.matchAll(/class\s*=\s*"([^"]+)"/g);

  for (const match of classMatches) {
    String(match[1] || "")
      .split(/\s+/)
      .map((className) => className.trim())
      .filter(Boolean)
      .forEach((className) => classNames.add(className));
  }

  return classNames;
}

function filterBlock(block, classNames) {
  const trimmed = block.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("@media")) {
    const headerEnd = trimmed.indexOf("{");
    const header = trimmed.slice(0, headerEnd).trim();
    const innerCss = trimmed.slice(headerEnd + 1, -1);
    const innerBlocks = parseTopLevelBlocks(innerCss)
      .map((innerBlock) => filterBlock(innerBlock, classNames))
      .filter(Boolean);

    if (innerBlocks.length === 0) {
      return "";
    }

    return `${header} {\n${indent(innerBlocks.join("\n\n"))}\n}`;
  }

  const selector = trimmed.slice(0, trimmed.indexOf("{")).trim();
  return selectorMatches(selector, classNames) ? trimmed : "";
}

function selectorMatches(selector, classNames) {
  return [...classNames].some((className) => {
    const escaped = escapeForRegex(className);
    return new RegExp(`\\.${escaped}(?![A-Za-z0-9_-])`).test(selector);
  });
}

function parseTopLevelBlocks(css = "") {
  const blocks = [];
  let depth = 0;
  let blockStart = -1;

  for (let index = 0; index < css.length; index += 1) {
    const character = css[index];

    if (character === "{") {
      if (depth === 0) {
        blockStart = findBlockStart(css, index);
      }
      depth += 1;
      continue;
    }

    if (character === "}") {
      depth -= 1;
      if (depth === 0 && blockStart >= 0) {
        blocks.push(css.slice(blockStart, index + 1).trim());
        blockStart = -1;
      }
    }
  }

  return blocks;
}

function findBlockStart(css, braceIndex) {
  let start = braceIndex;
  while (start > 0 && !/[\n}]/.test(css[start - 1])) {
    start -= 1;
  }
  return start;
}

function indent(value) {
  return value
    .split("\n")
    .map((line) => (line ? `  ${line}` : line))
    .join("\n");
}

function escapeForRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
