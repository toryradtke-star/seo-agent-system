const fs = require("fs");
const path = require("path");

let DatabaseCtor = null;

function getDatabaseCtor() {
  if (!DatabaseCtor) {
    // Lazy load to keep non-DB code paths resilient during setup.
    DatabaseCtor = require("better-sqlite3");
  }
  return DatabaseCtor;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function openDatabase(dbPath) {
  ensureDir(dbPath);
  const Database = getDatabaseCtor();
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      base_url TEXT NOT NULL,
      settings_json TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(project_id, base_url),
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      status TEXT NOT NULL,
      mode TEXT,
      prompt_version TEXT,
      template_version TEXT,
      model TEXT,
      FOREIGN KEY(site_id) REFERENCES sites(id)
    );

    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      normalized_url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(site_id, normalized_url),
      FOREIGN KEY(site_id) REFERENCES sites(id)
    );

    CREATE TABLE IF NOT EXISTS page_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER NOT NULL,
      run_id INTEGER NOT NULL,
      content_hash TEXT NOT NULL,
      dataset_path TEXT,
      tokens_in INTEGER,
      tokens_out INTEGER,
      cost_usd REAL,
      status TEXT NOT NULL,
      error TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(page_id) REFERENCES pages(id),
      FOREIGN KEY(run_id) REFERENCES runs(id)
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      path TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(snapshot_id) REFERENCES page_snapshots(id)
    );

    CREATE INDEX IF NOT EXISTS idx_runs_site_id ON runs(site_id);
    CREATE INDEX IF NOT EXISTS idx_pages_site_id ON pages(site_id);
    CREATE INDEX IF NOT EXISTS idx_snapshots_page_id ON page_snapshots(page_id);
    CREATE INDEX IF NOT EXISTS idx_snapshots_run_id ON page_snapshots(run_id);
  `);
}

function nowIso() {
  return new Date().toISOString();
}

function createRepository(db) {
  const q = {
    getProjectByName: db.prepare(`SELECT * FROM projects WHERE name = ?`),
    insertProject: db.prepare(`INSERT INTO projects (name, created_at) VALUES (?, ?)`),

    getSiteByProjectUrl: db.prepare(`SELECT * FROM sites WHERE project_id = ? AND base_url = ?`),
    insertSite: db.prepare(`INSERT INTO sites (project_id, base_url, settings_json, created_at) VALUES (?, ?, ?, ?)`),

    insertRun: db.prepare(`
      INSERT INTO runs (site_id, started_at, status, mode, prompt_version, template_version, model)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    updateRun: db.prepare(`
      UPDATE runs
      SET finished_at = ?, status = ?, mode = ?, prompt_version = ?, template_version = ?, model = ?
      WHERE id = ?
    `),
    getRunById: db.prepare(`SELECT * FROM runs WHERE id = ?`),

    getPageBySiteNorm: db.prepare(`SELECT * FROM pages WHERE site_id = ? AND normalized_url = ?`),
    insertPage: db.prepare(`INSERT INTO pages (site_id, url, normalized_url, created_at) VALUES (?, ?, ?, ?)`),

    insertSnapshot: db.prepare(`
      INSERT INTO page_snapshots
      (page_id, run_id, content_hash, dataset_path, tokens_in, tokens_out, cost_usd, status, error, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    updateSnapshotMetrics: db.prepare(`
      UPDATE page_snapshots
      SET tokens_in = ?, tokens_out = ?, cost_usd = ?, status = ?, error = ?
      WHERE id = ?
    `),
    latestSnapshotByPage: db.prepare(`
      SELECT * FROM page_snapshots
      WHERE page_id = ?
      ORDER BY id DESC
      LIMIT 1
    `),

    insertArtifact: db.prepare(`
      INSERT INTO artifacts (snapshot_id, type, path, created_at)
      VALUES (?, ?, ?, ?)
    `),

    snapshotsByRun: db.prepare(`SELECT * FROM page_snapshots WHERE run_id = ?`),
  };

  return {
    ensureProject(projectName = "default") {
      let row = q.getProjectByName.get(projectName);
      if (!row) {
        const r = q.insertProject.run(projectName, nowIso());
        row = { id: r.lastInsertRowid, name: projectName };
      }
      return row;
    },

    ensureSite(projectId, baseUrl, settings = {}) {
      let row = q.getSiteByProjectUrl.get(projectId, baseUrl);
      if (!row) {
        const r = q.insertSite.run(projectId, baseUrl, JSON.stringify(settings || {}), nowIso());
        row = { id: r.lastInsertRowid, project_id: projectId, base_url: baseUrl };
      }
      return row;
    },

    createRun(siteId, payload = {}) {
      const res = q.insertRun.run(
        siteId,
        payload.startedAt || nowIso(),
        payload.status || "running",
        payload.mode || "full",
        payload.promptVersion || "unknown",
        payload.templateVersion || "unknown",
        payload.model || "unknown"
      );
      return q.getRunById.get(res.lastInsertRowid);
    },

    finishRun(runId, payload = {}) {
      const current = q.getRunById.get(runId);
      q.updateRun.run(
        payload.finishedAt || nowIso(),
        payload.status || current?.status || "completed",
        payload.mode || current?.mode || "full",
        payload.promptVersion || current?.prompt_version || "unknown",
        payload.templateVersion || current?.template_version || "unknown",
        payload.model || current?.model || "unknown",
        runId
      );
      return q.getRunById.get(runId);
    },

    ensurePage(siteId, url, normalizedUrl) {
      let row = q.getPageBySiteNorm.get(siteId, normalizedUrl);
      if (!row) {
        const r = q.insertPage.run(siteId, url, normalizedUrl, nowIso());
        row = { id: r.lastInsertRowid, site_id: siteId, url, normalized_url: normalizedUrl };
      }
      return row;
    },

    createSnapshot(pageId, runId, payload = {}) {
      const r = q.insertSnapshot.run(
        pageId,
        runId,
        payload.contentHash || "",
        payload.datasetPath || null,
        payload.tokensIn || null,
        payload.tokensOut || null,
        payload.costUsd || null,
        payload.status || "pending",
        payload.error || null,
        nowIso()
      );
      return r.lastInsertRowid;
    },

    updateSnapshotMetrics(snapshotId, payload = {}) {
      q.updateSnapshotMetrics.run(
        payload.tokensIn || null,
        payload.tokensOut || null,
        payload.costUsd || null,
        payload.status || "completed",
        payload.error || null,
        snapshotId
      );
    },

    getLatestSnapshotByPage(pageId) {
      return q.latestSnapshotByPage.get(pageId);
    },

    addArtifact(snapshotId, type, artifactPath) {
      q.insertArtifact.run(snapshotId, type, artifactPath, nowIso());
    },

    listSnapshotsByRun(runId) {
      return q.snapshotsByRun.all(runId);
    },
  };
}

module.exports = {
  openDatabase,
  initSchema,
  createRepository,
};
