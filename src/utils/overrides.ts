import {
  linkToDataType,
  linkToSymbolPath,
  removeParentalPrefix,
  toHtmlSafeString,
} from "./helper";

const {
  TemplateRenderer,
  TemplateTagsResolver,
} = require("@webdoc/template-library");

/**
 * Add additional helper methods to the default TemplateRenderer for use from within the templates.
 */
export function overrideTemplateRenderer() {
  let randomDice = 0;

  TemplateRenderer.prototype.toHtmlSafe = toHtmlSafeString;
  TemplateRenderer.prototype.resolveDocLink = function (docLink: any) {
    if (typeof docLink === "string") {
      return this.linkTo(docLink, docLink);
    }

    return this.linkTo(docLink.path, docLink.path);
  };
  TemplateRenderer.prototype.generateRandomID = () => `${randomDice++}`;
  TemplateRenderer.prototype.removeParentalPrefix = removeParentalPrefix;
  TemplateRenderer.prototype.linkToDataType = linkToDataType;
  TemplateRenderer.prototype.linkToSymbolPath = linkToSymbolPath;
}

/**
 * Override the default TemplateTagsResolver to remove the parental prefixes from any {@link} tag.
 */
export function overrideTemplateTagsResolver() {
  const isValidUrl = (string: string) => {
    try {
      new URL(string);
    } catch (_) {
      return false;
    }

    return true;
  };

  const matchTextPrefix = (content: any, tagStart: any) => {
    const index = tagStart - 1;

    if (content.charAt(index) !== "]") {
      return;
    }

    let bracketDepth = 1;
    let openIndex = -1;

    for (let i = index - 1; i >= 0; i--) {
      const char = content.charAt(i);

      if (char === "[") {
        --bracketDepth;

        if (bracketDepth === 0) {
          openIndex = i;
          break;
        }
      } else if (char === "]") {
        ++bracketDepth;
      }
    }

    if (openIndex === -1) {
      return;
    }

    const result: any = [content.slice(openIndex, index + 1)];
    result.index = openIndex;
    return result;
  };

  // Overriding the default runLinkTag to use renderer.linkToSymbolPath instead of renderer.linkTo function.
  // This is in order to automatically remove all the parental prefixes from any {@link} tag on the docs.
  TemplateTagsResolver.prototype.runLinkTag = function (input: any) {
    const linkPattern = /{@link ([^|\s}]*)([\s|])?([^}]*)}/g;
    let linkMatch = linkPattern.exec(input);

    while (linkMatch) {
      const linkTextMatch = matchTextPrefix(input, linkMatch.index);
      const link = linkMatch[1];
      const linkName = linkMatch[3];
      const linkText = linkTextMatch
        ? linkTextMatch[0].slice(1, -1)
        : linkName || link;
      let replaced;

      if (isValidUrl(link)) {
        replaced =
          `<a ${this.linkClass ? 'class="' + this.linkClass + '"' : ""}` +
          `href="${link}">${linkText}</a>`;
      } else {
        replaced = this.renderer.linkToSymbolPath(link, linkText);
      }

      const startIndex = linkTextMatch
        ? (linkTextMatch as any).index
        : linkMatch.index;
      const endIndex = linkMatch.index + linkMatch[0].length;
      input = input.slice(0, startIndex) + replaced + input.slice(endIndex);
      linkMatch = linkPattern.exec(input);
    }

    return input;
  };
}
