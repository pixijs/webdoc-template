import { htmlToMd, mdTable, packages } from '../../publish';
import { linkTo } from '../links/linker';
import { runTagResolver } from '../templates/templateTagResolver';
import { traverse } from '../utils';

import type {
    DeprecatedTag,
    Doc,
    DocType,
    FunctionDoc,
    MethodDoc,
    PackageDoc,
    Param,
    PropertyDoc,
    Return
} from '@webdoc/model';

export interface DataType<T>
{
    name: string;
    mdName: string;
    doc: T;
}

export abstract class Base<T extends Doc> implements DataType<T>
{
    public name: string;
    public mdName: string;
    public doc: T;

    protected separator = '\n---------------------------------------\n';

    protected unsafeString = [
        ['|', '&#124;'],
        ['<', '&#60;'],
        ['>', '&#62;'],
        ['@', '&#64;'],
        [':', '&#58;'],
        ['{', '&#123;'],
        ['}', '&#125;'],
    ];

    constructor(name: string, mdName: string, doc: T)
    {
        this.name = name;
        this.mdName = mdName;
        this.doc = doc;
    }

    protected getPackage()
    {
        const pkg = this.doc.loc?.file.package as PackageDoc;
        const res = packages.find((p) => p.name === pkg.name);

        if (!res)
        {
            throw new Error(`Could not find package ${pkg.name}`);
        }

        return res;
    }

    protected getMembersOfType<T extends Doc>(type: DocType)
    {
        // loop through all the members of the interface
        const members: T[] = [];

        traverse(this.doc, 'members', (member) =>
        {
            if (member.access === 'private' || member.type !== type || member.name === 'constructor')
            {
                return;
            }

            members.push(member as T);
        });

        return members;
    }

    protected replaceUnsafeStrings(str: string)
    {
        let res = str;
        const codeBlocks = new Map<string, string>();
        const regex = [
            /`([^`]*)`/g,
            /^```(?:|javascript|js)\n([\s\S]*?)```$/gm,
        ];

        regex.forEach((reg) =>
        {
            // replace all matches with placeholders
            res = res.replace(reg, (match) =>
            {
                const placeholder = `__CODE_BLOCK_${codeBlocks.size}__`;

                codeBlocks.set(placeholder, match);

                return placeholder;
            });
        });

        this.unsafeString.forEach((rep) =>
        {
            res = res.replaceAll(rep[0], rep[1]);
        });

        // replace all placeholders with code blocks
        codeBlocks.forEach((block, placeholder) =>
        {
            res = res.replace(placeholder, block);
        });

        return res;
    }

    protected getExamples(doc: Doc = this.doc)
    {
        const examples = doc.examples;

        if (!examples || examples.length === 0)
        {
            return '';
        }

        const all = examples.map((ex) =>
            `
\`\`\`js
${ex.code}
\`\`\`
      `);

        return all.join('\n');
    }

    protected getPropertyEntry(prop: PropertyDoc, useSignature = false)
    {
        // TODO: adding span onto the heading leads to extremely long lines in the sidebar
        const isDeprecated = prop.tags?.find((tag) => tag.name === 'deprecated') as DeprecatedTag;
        const name = prop.name;
        const brief = prop.brief;
        const description = prop.description;
        const examples = this.getExamples(prop);
        const defaultValue = prop.defaultValue;
        const dataType = prop.dataType?.[0] as string ?? 'unknown';

        let res = '### ';

        res += `${name}`;
        // TODO: link to type
        if (useSignature)
        {
            res += `: <span><code>${this.replaceUnsafeStrings(this.createSignature(prop as any))}</code></span>\n`;
        }
        else
        {
            if (dataType === 'unknown')
            {
                // console.warn(`Unknown data type for property ${name} in ${this.name}`);
            }

            res += `: <span><code>${this.replaceUnsafeStrings(dataType)}</code></span>\n`;
        }

        if (isDeprecated)
        {
            // remove last new line
            res = res.slice(0, -1);
            res += `<span class="deprecated-tag"> Deprecated: ${isDeprecated.deprecated}</span>\n`;
        }

        if (defaultValue)
        {
            // TODO: link to default value
            res += `- **Default Value**: <code>${this.replaceUnsafeStrings(defaultValue)}</code>\n\n`;
        }

        if (brief) res += `${this.replaceUnsafeStrings(htmlToMd.translate(runTagResolver(brief)))}\n`;
        if (description) res += `${this.replaceUnsafeStrings(htmlToMd.translate(runTagResolver(description)))}\n`;
        if (examples) res += `${examples}\n`;

        return res;
    }

    protected formatProperties(props: PropertyDoc[], name = '## Members')
    {
        if (!props || props.length === 0)
        {
            return '';
        }

        const all: string[] = [name];

        props.forEach((prop) =>
        {
            all.push(`<article>\n\n${this.getPropertyEntry(prop)}\n</article>\n`);
            all.push(this.separator);
        });

        return all.join('\n');
    }

    protected createSignature(method: MethodDoc | FunctionDoc, includeReturnType = true)
    {
        let signature = ``;
        const params = method.params;
        const returns = method.returns;
        const returnMarker = includeReturnType ? '->' : '';

        signature += params
            ? `(${params
                .filter((param) => !param.identifier.includes('.'))
                .map((param) => `${param.identifier}: ${param.dataType?.[0] ?? ''}`)
                .join(', ')}) ${returnMarker}`
            : `() ${returnMarker}`;

        if (!includeReturnType) return signature;

        signature += returns
            ? ` ${returns.map((ret) => ret.dataType?.[0] ?? '').join(' | ')}`
            : ' void';

        return signature;
    }

    protected getMethodEntry(method: MethodDoc | FunctionDoc)
    {
        let res = this.getPropertyEntry(method as any, true);

        const params = method.params;
        const returns = method.returns;

        if ((!params || params.length === 0) && (!returns || returns.length === 0)) return res;

        const getType = (type: Param | Return) =>
        {
            if (!type.dataType) return '';

            return `<code>${this.replaceUnsafeStrings(type.dataType![0] as string)}</code>`;
        };

        const getDescription = (type: Param | Return) =>
        {
            if (!type.description) return '';

            return this.replaceUnsafeStrings(
                htmlToMd.translate(runTagResolver(type.description)).replaceAll('\n', '<br />')
            );
        };

        if (params && params.length > 0)
        {
            const headers = ['Name', 'Type', 'Description'];
            const rows = params.map((param) => [param.identifier, getType(param), getDescription(param)]);

            res += `\n#### Parameters:\n${mdTable([headers, ...rows])}`;
        }

        if (returns && returns.length > 0)
        {
            const includesVoid = returns.every((ret) => ret.dataType?.[0] === 'void' && !ret.description);

            if (includesVoid) return res;

            const headers = ['Type', 'Description'];
            const rows = returns.map((ret) => [getType(ret), getDescription(ret)]);

            res += `\n#### Returns:\n${mdTable([headers, ...rows])}`;
        }

        return res;
    }

    protected formatMethods(methods: (MethodDoc | FunctionDoc)[], name = '## Methods')
    {
        if (!methods || methods.length === 0)
        {
            return '';
        }

        const all: string[] = [name];

        methods.forEach((method) =>
        {
            all.push(`<article>\n\n${this.getMethodEntry(method)}\n</article>\n`);
            all.push(this.separator);
        });

        return all.join('\n');
    }

    protected getExtends()
    {
        const strings: string[] = [];

        this.doc.extends?.forEach((ext) =>
        {
            // TODO: this might need to be changed to include namespace path
            const doc = ext as Doc;
            let symbolPath = '';

            if (!doc.name)
            {
                symbolPath = ext as string;
            }
            else if (doc.parent?.type === 'NSDoc')
            {
                symbolPath = `${doc.parent.name}.${doc.name}`;
            }
            else
            {
                symbolPath = doc.name;
            }

            strings.push(`- ${this.replaceUnsafeStrings(linkTo(symbolPath as string, symbolPath as string))}`);
        });

        if (strings.length === 0) return '';

        return `## Extends\n${strings.join('\n')}`;
    }

    protected getSummary()
    {
        const pkg = this.getPackage();

        // If name includes a dot then it should link to a namespace
        // not a package
        const path = this.name.includes('.')
            ? `${this.name.split('.')[1]}`
            : this.name;

        return `[${pkg.name}](../modules/${pkg.mdName}).${path}

${this.replaceUnsafeStrings(htmlToMd.translate(runTagResolver(this.doc.brief!)))}
${this.replaceUnsafeStrings(htmlToMd.translate(runTagResolver(this.doc.description!)))}

${this.getExamples()}

// TODO: @see

        `;
    }

    abstract save(outdir: string): void;
}
