import { linkTo } from '../links/linker';

const CODE_PATTERN = /{@code ([^}]*)}/;
const LINK_PATTERN = /{@link ([^|\s}]*)([\s|])?([^}]*)}/;

function runCodeTag(input: string): string
{
    const codePattern = CODE_PATTERN;

    let codeMatch = codePattern.exec(input);

    while (codeMatch)
    {
        const code = codeMatch[1];
        const startIndex = codeMatch.index;
        const endIndex = codeMatch.index + codeMatch[0].length;

        input = `${input.slice(0, startIndex)}<code>${code}</code>${input.slice(endIndex)}`;

        codeMatch = codePattern.exec(input);
    }

    return input;
}

function runLinkTag(input: string)
{
    const linkPattern = LINK_PATTERN;
    let linkMatch = linkPattern.exec(input);

    while (linkMatch)
    {
        const linkTextMatch = matchTextPrefix(input, linkMatch.index);
        const link = linkMatch[1];
        const linkName = linkMatch[3];
        const linkText = linkTextMatch ? linkTextMatch[0].slice(1, -1) : linkName || link;

        let replaced;

        if (isValidUrl(link))
        {
            replaced = `[${linkText}](${link})`;
        }
        else
        {
            // TODO: This is where we need to replace the link with the correct link
            replaced = linkTo(link, linkText);
        }

        const startIndex = linkTextMatch ? linkTextMatch.index : linkMatch.index;
        const endIndex = linkMatch.index + linkMatch[0].length;

        input = input.slice(0, startIndex) + replaced + input.slice(endIndex);

        linkMatch = linkPattern.exec(input);
    }

    return input;
}

export function runTagResolver(input: string): string
{
    input = runCodeTag(input);
    input = runLinkTag(input);

    return input;
}

// Helper function to check if link content is just a URL
function isValidUrl(string: string)
{
    try
    {
        // eslint-disable-next-line no-new
        new URL(string);
    }
    catch (_)
    {
        return false;
    }

    return true;
}

// Match the [TEXT_PREFIX] before a {@inline-tag ...}
function matchTextPrefix(content: string, tagStart: number): undefined | (string[] & { index: number })
{
    const index = tagStart - 1;

    if (content.charAt(index) !== ']')
    {
        return undefined;
    }

    // Allow nested bracket closures in the TEXT_PREFIX, e.g. TEXT_PREFIX[] is valid
    // This is the no. of closing brackets we are in
    // _] = 1
    // _[]] = 1
    let bracketDepth = 1; // (1 because we include the "]" at "index")

    // Index at which last opening bracket is found
    let openIndex = -1;

    for (let i = index - 1; i >= 0; i--)
    {
        const char = content.charAt(i);

        if (char === '[')
        {
            --bracketDepth;

            if (bracketDepth === 0)
            {
                openIndex = i;
                break;
            }
        }
        else if (char === ']')
        {
            ++bracketDepth;
        }
    }

    if (openIndex === -1)
    {
        return undefined;
    }

    const result = [content.slice(openIndex, index + 1)] as string[] & {
        index: number;
    };

    result.index = openIndex;

    return result;
}
