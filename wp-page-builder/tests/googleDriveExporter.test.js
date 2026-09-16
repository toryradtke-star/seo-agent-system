import test from "node:test";
import assert from "node:assert/strict";
import { buildDriveDocumentSections, createGoogleDriveExporter } from "../integrations/googleDriveExporter.js";

test("buildDriveDocumentSections creates titled code-block document text", () => {
  const sections = buildDriveDocumentSections({
    title: "Service Page - Dry Needling",
    blueprint: { pageType: "service", sections: [{ component: "hero", variant: "split" }] },
    sections: [{ component: "hero", variant: "split", html: "<section>Example</section>", css: ".hero { padding: 1rem; }" }],
    globalCSS: ".page { padding: 1rem; }"
  });

  assert.ok(sections.text.includes("PAGE BLUEPRINT"));
  assert.ok(sections.text.includes("SECTION 1 - hero (split)"));
  assert.ok(sections.text.includes("HTML"));
  assert.ok(sections.text.includes("CSS"));
  assert.ok(sections.text.includes("GLOBAL CSS"));
});

test("createGoogleDriveExporter works with injected Drive and Docs clients", async () => {
  const calls = [];
  const exporter = createGoogleDriveExporter({
    getGoogleAuth: async () => ({ token: "fake-auth" }),
    createDriveClient: () => ({
      files: {
        list: async ({ q }) => {
          calls.push({ type: "list", q });
          if (q.includes("WP Page Builder")) {
            return { data: { files: [{ id: "root-folder" }] } };
          }
          if (q.includes("Service Pages")) {
            return { data: { files: [{ id: "service-folder" }] } };
          }
          return { data: { files: [] } };
        },
        create: async ({ requestBody }) => {
          calls.push({ type: "create", requestBody });
          return { data: { id: requestBody.mimeType === "application/vnd.google-apps.document" ? "doc-123" : "folder-123" } };
        }
      }
    }),
    createDocsClient: () => ({
      documents: {
        batchUpdate: async ({ documentId, requestBody }) => {
          calls.push({ type: "batchUpdate", documentId, requestCount: requestBody.requests.length });
          return { data: {} };
        }
      }
    })
  });

  const result = await exporter({
    pageType: "service",
    topic: "Dry Needling Alexandria",
    blueprint: {
      pageType: "service",
      intent: "conversion",
      sections: [{ component: "hero", variant: "split" }]
    },
    sections: [{ component: "hero", variant: "split", html: "<section>Example</section>", css: "" }],
    globalCSS: ".page { padding: 1rem; }",
    html: "<section>Example</section>",
    css: ".hero { padding: 1rem; }"
  });

  assert.equal(result.documentId, "doc-123");
  assert.equal(result.url, "https://docs.google.com/document/d/doc-123");
  assert.ok(calls.some((call) => call.type === "batchUpdate"));
});
