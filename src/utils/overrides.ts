import { initLogger } from './logs';

const { isDataType, query } = require('@webdoc/model');
const { LinkerPlugin, TemplateRenderer } = require('@webdoc/template-library');

function removeParentalPrefix(symbolPath: string)
{
    return symbolPath.replace(/.*[.#](.*)$/, '$1');
}

export function toHtmlSafeString(str: string | Buffer)
{
    if (typeof str !== 'string') str = String(str);

    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

/**
 * Override the LinkerPlugin's linkTo function to remove the parental prefixes from any link.
 */
export function overrideLinkerPlugin()
{
    const logger = initLogger();
    const catharsis = require('catharsis');
    const hasUrlPrefix = (text: string) => (/^(http|ftp)s?:\/\//).test(text);
    const isComplexTypeExpression = (expr: string) =>
        (/^{.+}$/).test(expr) || (/^.+\|.+$/).test(expr) || (/^.+<.+>$/).test(expr);

    const parseType = (longname: string) =>
    {
        let err;

        try
        {
            return catharsis.parse(longname, {
                jsdoc: true,
            });
        }
        catch (e: any)
        {
            err = new Error(`unable to parse ${longname}: ${e.message}`);
            logger.error(err);

            return longname;
        }
    };

    const stringifyType = (
        parsedType: any,
        cssClass: any,
        stringifyLinkMap: any
    ) =>
        catharsis.stringify(parsedType, {
            cssClass,
            htmlSafe: true,
            links: stringifyLinkMap,
        });

    const mapToLinks = (documentRegistry: any) =>
    {
        const keys = documentRegistry.keys();
        const object: Record<string, any> = {};

        for (const key of keys)
        {
            object[key] = documentRegistry.get(key).uri;
        }

        return object;
    };

    const formatObjectNotation = (object: string, indentSize = 3) =>
    {
        // break apart into lines separating properties (and nested)
        let lines = object
            .slice(1, -1)
            .trim()
            .split(',')
            .join(',\n')
            .split('{')
            .join('{\n')
            .split('}')
            .join('\n}')
            .split('\n');

        // add first and last bracket
        lines.splice(0, 0, '{');
        lines.push('}');

        // format with indentation
        let indentation = 0;

        lines = lines.map((line, i) =>
        {
            if (line.indexOf('{') > -1)
            {
                indentation += 1;
            }
            if (line[0] === '}')
            {
                indentation -= 1;
            }

            return i === 0
                ? line
                : '&nbsp;'.repeat(indentation * indentSize)
                      + line.trim().replace(/\s+:/g, ':');
        });

        return lines.join('<br/>');
    };

    // eslint-disable-next-line func-names
    LinkerPlugin.prototype.linkTo = function (
        docPath: any,
        linkText = docPath,
        options: Record<string, any> = {}
    )
    {
        if (!options)
        {
            options = {};
        }

        if (!docPath)
        {
            return '';
        }

        if (this.queryCache.has(docPath))
        {
            return `<a href=${encodeURI(
                this.queryCache.get(docPath) || ''
            )}>${removeParentalPrefix(linkText)}</a>`;
        }

        if (isDataType(docPath))
        {
            let link = docPath.template;

            if (options.htmlSafe !== false)
            {
                link = link.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }

            for (let i = 1; i < docPath.length; i++)
            {
                // TODO: Include more syntax highlighting
                // console.log(
                //   `docPath${i}:`,
                //   typeof docPath[i] === "string" ? docPath[i] : docPath[i].name
                // );

                link = link.replace(
                    `%${i}`,
                    this.linkTo(docPath[i], docPath[i], options)
                );
            }

            if (link[0] === '{' && link[link.length - 1] === '}')
            {
                link = formatObjectNotation(link);
            }

            return link.replace(
                /\b(\w+\??)(?=\s*:)/g,
                '<span class="hljs-attr">$1</span>'
            );
        }
        else if (typeof docPath !== 'string')
        {
            docPath = docPath.path;
        }

        if (linkText && typeof linkText !== 'string')
        {
            linkText = linkText.name;
        }

        const classString = options.cssClass
            ? ` class="${options.cssClass}"`
            : '';
        let fileUrl;
        const fragmentString = options.fragmentId
            ? `#${options.fragmentId}`
            : '';
        let text;
        let parsedType;
        const stripped = docPath ? docPath.replace(/^<|>$/g, '') : '';

        if (hasUrlPrefix(stripped))
        {
            fileUrl = stripped;
            text = linkText || stripped;
        }
        else if (
            docPath
            && isComplexTypeExpression(docPath)
            && (/\{@.+\}/).test(docPath) === false
            && (/^<[\s\S]+>/).test(docPath) === false
        )
        {
            parsedType = parseType(docPath);

            return stringifyType(
                parsedType,
                options.cssClass,
                mapToLinks(this.documentRegistry)
            );
        }
        else
        {
            const doc = query(docPath, this.renderer.docTree)[0];

            if (doc)
            {
                const rec = this.documentRegistry.get(doc.id);

                fileUrl
                    = rec && rec.uri
                        ? this.processInternalURI(rec.uri)
                        : this.getURI(doc);

                if (fileUrl)
                {
                    this.queryCache.set(docPath, fileUrl);
                }
            }
            else
            {
                for (
                    let i = 0;
                    i < this.importedManifests.length && !fileUrl;
                    i++
                )
                {
                    const externalInterface = this.importedManifests[i];
                    const doc = query(docPath, externalInterface.root)[0];

                    if (doc)
                    {
                        const { uri } = this.getDocumentRecord(doc.id);

                        if (uri)
                        {
                            fileUrl = uri;
                            this.queryCache.set(docPath, fileUrl);
                        }
                    }
                }

                if (!fileUrl)
                {
                    return linkText || docPath;
                }
            }

            text = removeParentalPrefix(linkText || docPath);
        }

        text = options.monospace ? `<code>${text}</code>` : text;

        if (!fileUrl)
        {
            return text;
        }

        return `<a href="${encodeURI(
            fileUrl + fragmentString
        )}"${classString}>${text}</a>`;
    };
}

/**
 * Add additional helper methods to the default TemplateRenderer for use from within the templates.
 */
export function overrideTemplateRenderer()
{
    let randomDice = 0;

    TemplateRenderer.prototype.toHtmlSafe = toHtmlSafeString;

    // eslint-disable-next-line func-names
    TemplateRenderer.prototype.resolveDocLink = function (docLink: any)
    {
        if (typeof docLink === 'string')
        {
            return this.linkTo(docLink, docLink);
        }

        return this.linkTo(docLink.path, docLink.name);
    };
    TemplateRenderer.prototype.generateRandomID = () => `${randomDice++}`;
    TemplateRenderer.prototype.removeParentalPrefix = removeParentalPrefix;
}
