import fs from 'fs';
import path from 'path';
import { htmlToMd, mdTable } from '../../publish';
import { runTagResolver } from '../templates/templateTagResolver';
import { Base } from './Base';

import type { ClassDoc, DeprecatedTag, MethodDoc, PropertyDoc } from '@webdoc/model';

export class Class extends Base<ClassDoc>
{
    private getConstructor()
    {
        const ctr = this.doc.members.find((member) => member.name === 'constructor') as MethodDoc;

        if (!ctr)
        {
            return `<article>\n\n### new ${this.doc.parent!.path}()\n</article>`;
        }
        const all: string[] = [];
        const isDeprecated = ctr.tags?.find((tag) => tag.name === 'deprecated') as DeprecatedTag;
        const brief = ctr.brief;
        const description = ctr.description;
        const examples = this.getExamples(ctr);
        const params = ctr.params;

        let res = '<article>\n\n### ';
        const signature = `<span><code>${this.replaceUnsafeStrings(this.createSignature(ctr, false))}</code></span>`;

        res += `new ${ctr.parent!.path}: ${signature}\n`;

        if (isDeprecated)
        {
            // remove last new line
            res = res.slice(0, -1);
            res += `<span class="deprecated-tag"> Deprecated: ${isDeprecated.deprecated}</span>\n`;
        }

        if (brief)
        {
            res += `${this.replaceUnsafeStrings(htmlToMd.translate(runTagResolver(brief)))}\n`;
        }

        if (description)
        {
            res += `${this.replaceUnsafeStrings(htmlToMd.translate(runTagResolver(description)))}\n`;
        }

        if (examples)
        {
            res += `${examples}\n`;
        }

        if (params)
        {
            const headers = ['Name', 'Type', 'Default', 'Description'];
            const rows = params.map((param) =>
            {
                // replace all with replacements
                const dataType = param.dataType?.[0] as string ?? '';
                const dataTypes = `<code>${this.replaceUnsafeStrings(dataType)}</code>`;
                const des = [];

                if (param.description)
                {
                    des.push(this.replaceUnsafeStrings(
                        htmlToMd.translate(runTagResolver(param.description)).replaceAll('\n', '<br />')
                    ));
                }

                return [param.identifier, dataTypes, `<code>${param.default ?? ''}</code>`, des.join('\n')];
            });

            res += `\n#### Parameters:\n${mdTable([
                headers,
                ...rows
            ])}`;
        }

        all.push(res);
        all.push('\n</article>');
        all.push(this.separator);

        return all.join('\n');
    }

    save(outdir: string)
    {
        const props = this.formatProperties(
            this.getMembersOfType<PropertyDoc>('PropertyDoc')
        );
        const methods = this.formatMethods(
            this.getMembersOfType<MethodDoc>('MethodDoc')
        );
        const markdown = `---
id: "${this.mdName}"
title: "Class: ${this.name}"
sidebar_label: "${this.name}"
custom_edit_url: null
---

${this.getSummary()}

${this.getConstructor()}

${this.getExtends()}

${props}

${methods}

    `;

        // ensure the modules directory exists
        fs.mkdirSync(path.join(outdir, 'classes'), { recursive: true });
        fs.writeFileSync(path.join(outdir, 'classes', `${this.mdName}.mdx`), markdown);
    }
}
