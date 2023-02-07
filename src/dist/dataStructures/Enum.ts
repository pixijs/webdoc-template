import fs from 'fs';
import path from 'path';
import { htmlToMd, mdTable } from '../../publish';
import { runTagResolver } from '../templates/templateTagResolver';
import { Base } from './Base';

import type { EnumDoc, PropertyDoc } from '@webdoc/model';

export class Enum extends Base<EnumDoc>
{
    private getProperties()
    {
        const properties = this.getMembersOfType<PropertyDoc>('PropertyDoc');

        let propertyString = '';

        // TODO: add links to properties in current page
        // TODO: add links to types
        if (properties.length > 0)
        {
            const headers = ['Name', 'Default', 'Description'];
            const rows = properties.map((prop) =>
            {
                const des = [];

                if (prop.brief)
                {
                    des.push(this.replaceUnsafeStrings(htmlToMd.translate(runTagResolver(prop.brief))));
                }
                if (prop.description)
                {
                    des.push(this.replaceUnsafeStrings(
                        htmlToMd.translate(runTagResolver(prop.description)).replaceAll('\n', '<br />')
                    ));
                }

                return [`<code>${prop.name}</code>`, prop.defaultValue, des.join('<br /><br />')];
            });

            propertyString = mdTable([headers, ...rows]);
        }

        return `## Summary\n${propertyString}`;
    }

    save(outdir: string)
    {
        const properties = this.getProperties();

        const markdown = `---
id: "${this.mdName}"
title: "Enum: ${this.name}"
sidebar_label: "${this.name}"
custom_edit_url: null
---

${this.getSummary()}

${properties}

    `;

        // ensure the modules directory exists
        fs.mkdirSync(path.join(outdir, 'enums'), { recursive: true });
        fs.writeFileSync(path.join(outdir, 'enums', `${this.mdName}.mdx`), markdown);
    }
}
