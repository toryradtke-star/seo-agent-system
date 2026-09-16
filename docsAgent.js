const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { google } = require("googleapis");

const TOKEN_PATH = path.join(__dirname, "token.json");
const CREDENTIALS_PATH = path.join(__dirname, "oauth.json");

async function authorize() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } =
    credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive.file"
    ],
  });

  console.log("Authorize this app by visiting this url:\n", authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise((resolve) => {
    rl.question("\nEnter the code from that page here: ", (code) => {
      rl.close();
      resolve(code);
    });
  });

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));

  console.log("Token stored to", TOKEN_PATH);
  return oAuth2Client;
}

function escapeDriveQueryValue(value) {
  return String(value || "").replace(/'/g, "\\'");
}

async function findFolder(drive, name, parentId) {
  const nameEscaped = escapeDriveQueryValue(name);
  const parentClause = parentId ? `'${parentId}' in parents and ` : "";
  const query =
    `${parentClause}mimeType='application/vnd.google-apps.folder' and ` +
    `name='${nameEscaped}' and trashed=false`;

  const res = await drive.files.list({
    q: query,
    fields: "files(id,name)",
    pageSize: 1,
  });

  return res.data.files && res.data.files.length > 0 ? res.data.files[0].id : null;
}

async function createFolder(drive, name, parentId) {
  const requestBody = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) requestBody.parents = [parentId];

  const res = await drive.files.create({
    requestBody,
    fields: "id",
  });

  return res.data.id;
}

async function ensureDriveFolderPath(drive, folderPath) {
  if (!folderPath || !String(folderPath).trim()) return null;

  const parts = String(folderPath)
    .split("/")
    .map((x) => x.trim())
    .filter(Boolean);

  if (parts.length === 0) return null;

  let currentParentId = null;
  for (const part of parts) {
    let folderId = await findFolder(drive, part, currentParentId);
    if (!folderId) {
      folderId = await createFolder(drive, part, currentParentId);
    }
    currentParentId = folderId;
  }

  return currentParentId;
}

async function sendToGoogleDoc(content, docTitle, options = {}) {
  console.log("DOCS: authorizing...");
  const auth = await authorize();

  const drive = google.drive({ version: "v3", auth });
  const docs = google.docs({ version: "v1", auth });
  const folderId = await ensureDriveFolderPath(drive, options.folderPath);

  console.log("DOCS: creating doc...");
  const requestBody = {
    name: docTitle || "Optimized PDP Output",
    mimeType: "application/vnd.google-apps.document",
  };
  if (folderId) requestBody.parents = [folderId];

  const file = await drive.files.create({
    requestBody,
    fields: "id",
  });

  const docId = file.data.id;
  console.log("DOCS: writing content...");

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: content,
          },
        },
      ],
    },
  });

  console.log("DOCS: done. Doc ID:", docId);
  console.log("DOCS: https://docs.google.com/document/d/" + docId);
  return { docId, url: "https://docs.google.com/document/d/" + docId, folderId };
}

module.exports = sendToGoogleDoc;

if (require.main === module) {
  const filePath = process.argv[2];
  const docTitle = process.argv[3];
  const folderPath = process.argv[4];

  if (!filePath) {
    console.error("Usage: node docsAgent.js <file-path> [doc-title] [folder-path]");
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  sendToGoogleDoc(content, docTitle, { folderPath }).catch((err) => {
    console.error("DOCS error:", err?.message || err);
    process.exit(1);
  });
}
