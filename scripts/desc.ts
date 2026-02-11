import { getTemplateDescription, loadAgentTemplate } from "../src/core/agent-templates.ts";

const name = process.argv[2] || "frontend";
const main = async () => {
  const raw = await loadAgentTemplate(name);
  console.log("RAW_START\n" + raw.slice(0, 120) + "\nRAW_END");
  const desc = await getTemplateDescription(name);
  console.log("DESC:", JSON.stringify(desc));
};
main();
