import type { ComponentMarkdown } from "blume";
import {
  diagramContent,
  docsLocale,
  heroContent,
  installCommand,
  packageManagers,
} from "./content.ts";

export const diagramMarkdown: ComponentMarkdown = ({ props }) => {
  const diagrams = diagramContent[docsLocale(props.locale)];
  if (typeof props.kind !== "string" || !Object.hasOwn(diagrams, props.kind)) return null;
  const content = diagrams[props.kind as keyof typeof diagrams];
  return [
    `**${content.title}**`,
    content.description,
    ...content.cards.map((card) => `- **${card.title}**: ${card.detail}`),
  ].join("\n\n");
};

export const heroMarkdown =
  (foldlabHref: string): ComponentMarkdown =>
  ({ props }) => {
    const locale = docsLocale(props.locale);
    const content = heroContent[locale];
    const diagram = diagramContent[locale].overview;
    return `**${content.headline}**\n\n${content.body}\n\n[${content.start}](#install) · [${content.experiment}](${foldlabHref})\n\n${diagram.description}`;
  };

export const installMarkdown: ComponentMarkdown = ({ props }) => {
  if (!Array.isArray(props.packages) || !props.packages.every((name) => typeof name === "string"))
    return null;
  return packageManagers
    .map(
      (manager) =>
        `**${manager}**\n\n\`\`\`sh\n${installCommand(manager, props.packages as string[])}\n\`\`\``,
    )
    .join("\n\n");
};
