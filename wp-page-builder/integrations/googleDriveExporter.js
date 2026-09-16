import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";
import { validateExportPayload } from "../core/contracts.js";
import { IntegrationError } from "../core/errors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(projectRoot, "..");
const ROOT_FOLDER_NAME = "WP Page Builder";
const FOLDER_CACHE = new Map();
let authPromise;

const PAGE_FOLDER_MAP = {
  service: "Service Pages",
  location: "Location Pages",
  landing: "Landing Pages",
  home: "Home Pages",
  homepage: "Home Pages",
  blog: "Blog Pages"
};

export async function exportPageToDrive(pageData) {
  const exporter = createGoogleDriveExporter();
  return exporter(pageData);
}

export function createGoogleDriveExporter(deps = {}) {
  const getAuth = deps.getGoogleAuth || getGoogleAuth;
  const createDriveClient = deps.createDriveClient || ((auth) => google.drive({ version: "v3", auth }));
  const createDocsClient = deps.createDocsClient || ((auth) => google.docs({ version: "v1", auth }));

  return async function exportWithDrive(pageData) {
    validateExportPayload(pageData);

    try {
      const auth = await getAuth();
      const drive = createDriveClient(auth);
      const docs = createDocsClient(auth);

      const pageType = normalizePageType(pageData.pageType || pageData.blueprint?.pageType);
      const topic = pageData.topic || pageData.title || "Untitled Page";
      const title = buildDocumentTitle(pageType, topic);
      const parentFolderId = await ensureDriveFolders(drive, pageType);
      const documentId = await createDocumentInFolder(drive, title, parentFolderId);

      await writeDocumentContent(docs, documentId, {
        title,
        blueprint: pageData.blueprint,
        sections: pageData.sections || [],
        globalCSS: pageData.globalCSS || pageData.css || ""
      });

      const url = `https://docs.google.com/document/d/${documentId}`;
      console.log("Page exported successfully:");
      console.log(url);

      return { documentId, url, title };
    } catch (error) {
      console.error("Failed to export page to Google Drive:", error.message);
      throw new IntegrationError("Google Drive export failed.", { cause: error });
    }
  };
}

async function getGoogleAuth() {
  if (!authPromise) {
    authPromise = createGoogleAuth();
  }
  return authPromise;
}

async function createGoogleAuth() {
  const credentials = await readJson(await resolveExistingPath(["credentials.json"]));
  const oauthCredentials = await readJsonIfPresent(await resolveExistingPath(["oauth.json"], false));
  const token = await readJsonIfPresent(await resolveExistingPath(["token.json"], false));

  if (oauthCredentials?.installed || oauthCredentials?.web) {
    return createOAuthClient(oauthCredentials, token);
  }

  if (credentials.installed || credentials.web) {
    return createOAuthClient(credentials, token);
  }

  if (credentials.type === "service_account") {
    return new google.auth.GoogleAuth({
      credentials,
      scopes: [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/documents"
      ]
    });
  }

  throw new IntegrationError("Unsupported credentials.json format.");
}

async function ensureDriveFolders(drive, pageType) {
  const rootFolderId = await ensureFolder(drive, ROOT_FOLDER_NAME, "root");
  const uniqueFolders = [...new Set(Object.values(PAGE_FOLDER_MAP))];
  const folderEntries = await Promise.all(
    uniqueFolders.map(async (folderName) => [folderName, await ensureFolder(drive, folderName, rootFolderId)])
  );

  const folderMap = Object.fromEntries(folderEntries);
  const targetFolderName = PAGE_FOLDER_MAP[pageType] || "Landing Pages";
  return folderMap[targetFolderName];
}

async function ensureFolder(drive, name, parentId) {
  const cacheKey = `${parentId}:${name}`;
  if (FOLDER_CACHE.has(cacheKey)) {
    return FOLDER_CACHE.get(cacheKey);
  }

  const escapedName = name.replace(/'/g, "\\'");
  const query = [
    `name='${escapedName}'`,
    "mimeType='application/vnd.google-apps.folder'",
    "trashed=false",
    `'${parentId}' in parents`
  ].join(" and ");

  const existing = await withRetry(() =>
    drive.files.list({
      q: query,
      fields: "files(id, name)",
      spaces: "drive"
    })
  );

  if (existing.data.files?.length) {
    const id = existing.data.files[0].id;
    FOLDER_CACHE.set(cacheKey, id);
    return id;
  }

  const created = await withRetry(() =>
    drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId]
      },
      fields: "id"
    })
  );

  if (!created.data.id) {
    throw new IntegrationError(`Failed to create Drive folder: ${name}`);
  }

  FOLDER_CACHE.set(cacheKey, created.data.id);
  return created.data.id;
}

async function createDocumentInFolder(drive, title, parentFolderId) {
  const created = await withRetry(() =>
    drive.files.create({
      requestBody: {
        name: title,
        mimeType: "application/vnd.google-apps.document",
        parents: [parentFolderId]
      },
      fields: "id"
    })
  );

  if (!created.data.id) {
    throw new IntegrationError("Google Doc creation failed.");
  }

  return created.data.id;
}

async function writeDocumentContent(docs, documentId, { title, blueprint, sections, globalCSS }) {
  const documentSections = buildDocumentSections({ title, blueprint, sections, globalCSS });
  const requests = [
    {
      insertText: {
        location: { index: 1 },
        text: documentSections.text
      }
    },
    {
      updateParagraphStyle: {
        range: { startIndex: documentSections.titleRange.start, endIndex: documentSections.titleRange.end },
        paragraphStyle: { namedStyleType: "TITLE" },
        fields: "namedStyleType"
      }
    },
    ...documentSections.headingRanges.map((range) => ({
      updateParagraphStyle: {
        range: { startIndex: range.start, endIndex: range.end },
        paragraphStyle: { namedStyleType: "HEADING_1" },
        fields: "namedStyleType"
      }
    })),
    ...documentSections.codeRanges.map((range) => ({
      updateTextStyle: {
        range: { startIndex: range.start, endIndex: range.end },
        textStyle: {
          weightedFontFamily: { fontFamily: "Courier New" }
        },
        fields: "weightedFontFamily"
      }
    }))
  ];

  await withRetry(() =>
    docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    })
  );
}

function buildDocumentSections({ title, blueprint, sections, globalCSS }) {
  const blueprintJson = JSON.stringify(blueprint, null, 2);
  const contentParts = [];
  const headingRanges = [];
  const codeRanges = [];

  let cursor = 1;

  const push = (text) => {
    contentParts.push(text);
    cursor += text.length;
  };

  const pushHeading = (heading) => {
    const start = cursor;
    push(`${heading}\n`);
    headingRanges.push({ start, end: cursor });
  };

  const pushCodeBlock = (language, value) => {
    const start = cursor;
    push(`\`\`\`${language}\n${value}\n\`\`\`\n\n`);
    codeRanges.push({ start, end: cursor });
  };

  const titleStart = cursor;
  push(`${title}\n\n`);
  const titleRange = { start: titleStart, end: cursor };

  pushHeading("PAGE BLUEPRINT");
  pushCodeBlock("json", blueprintJson);

  sections.forEach((section, index) => {
    pushHeading(`SECTION ${index + 1} - ${section.component} (${section.variant})`);
    push("HTML\n");
    pushCodeBlock("html", section.html);
    push("CSS\n");
    pushCodeBlock("css", section.css || "/* No section-specific CSS */");
  });

  pushHeading("GLOBAL CSS");
  pushCodeBlock("css", globalCSS);

  return {
    text: contentParts.join(""),
    titleRange,
    headingRanges,
    codeRanges
  };
}

export function buildDriveDocumentSections(input) {
  return buildDocumentSections(input);
}

function buildDocumentTitle(pageType, topic) {
  const normalized = normalizePageType(pageType);
  const pageLabelMap = {
    service: "Service Page",
    location: "Location Page",
    landing: "Landing Page",
    home: "Home Page",
    homepage: "Home Page",
    blog: "Blog Page"
  };

  return `${pageLabelMap[normalized] || "Landing Page"} - ${topic}`;
}

function normalizePageType(pageType) {
  return String(pageType || "landing").trim().toLowerCase();
}

function createOAuthClient(credentials, token) {
  const clientConfig = credentials.installed || credentials.web;
  if (!clientConfig) {
    throw new IntegrationError("OAuth credentials are missing installed/web client config.");
  }
  if (!token) {
    throw new IntegrationError("token.json is required for OAuth-based Google Drive export.");
  }

  const authClient = new google.auth.OAuth2(
    clientConfig.client_id,
    clientConfig.client_secret,
    clientConfig.redirect_uris?.[0]
  );
  authClient.setCredentials(token);
  return authClient;
}

async function withRetry(fn, retries = 3) {
  let attempt = 0;
  let lastError;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (!isRetryable(error) || attempt >= retries) {
        throw error;
      }
      await sleep(250 * attempt);
    }
  }
  throw lastError;
}

function isRetryable(error) {
  const status = error?.code || error?.response?.status;
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveExistingPath(fileNames, required = true) {
  const candidates = fileNames.flatMap((fileName) => [
    path.join(projectRoot, fileName),
    path.join(workspaceRoot, fileName)
  ]);

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch (_error) {
      continue;
    }
  }

  if (!required) {
    return null;
  }

  throw new IntegrationError(`Unable to locate required auth file: ${fileNames.join(", ")}`);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonIfPresent(filePath) {
  if (!filePath) {
    return null;
  }

  try {
    return await readJson(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
