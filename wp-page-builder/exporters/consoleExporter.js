export async function exportToConsole(pageData) {
  console.log(pageData.fullPageHtml);
  return { mode: "console" };
}
