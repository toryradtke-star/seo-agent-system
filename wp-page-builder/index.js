import { loadCliConfig, mergeCliOptions } from "./cli/loadConfig.js";
import { parseCliArgs, formatHelpText, validateCliOptions } from "./cli/parseArgs.js";
import { runPagePipeline } from "./core/pipeline.js";
import { generatePage } from "./generator/generatePage.js";

async function main(argv = process.argv.slice(2)) {
  const parsedArgs = parseCliArgs(argv);

  if (parsedArgs.help) {
    console.log(formatHelpText());
    return;
  }

  const configOptions = await loadCliConfig(parsedArgs.config);
  const options = mergeCliOptions(parsedArgs, configOptions);
  const validation = validateCliOptions(options);
  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  await runPagePipeline(
    {
      topic: options.topic,
      location: options.location,
      brand: options.brand,
      colors: options.colors,
      pageType: options.pageType,
      theme: options.theme
    },
    {
      theme: options.theme,
      examples: options.examples,
      exportModes: options.export,
      outputDir: options.outputDir
    }
  );
}

main().catch((error) => {
  console.error("Page generation/export failed:", error.message);
  process.exitCode = 1;
});

export { generatePage, main };
