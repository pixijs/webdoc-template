import fs from 'fs';
import path from 'path';
import { htmlToMd, mdTable } from '../../publish';
import { runTagResolver } from '../templates/templateTagResolver';
import { Base } from './Base';

import type {
    InterfaceDoc,
    MethodDoc,
    PropertyDoc
} from '@webdoc/model';

export class Interface extends Base<InterfaceDoc>
{
    private getInterfaceSummary()
    {
        const properties = this.getMembersOfType<PropertyDoc>('PropertyDoc');
        const methods = this.getMembersOfType<MethodDoc>('MethodDoc');
        let propertyString = '';

        if ((!properties || properties.length === 0) && (!methods || methods.length === 0))
        {
            return '';
        }

        // TODO: add links to properties in current page
        if (properties.length > 0)
        {
            const headers = ['Name', 'Type', 'Description'];
            const rows = properties.map((prop) =>
            {
                // replace all with replacements
                const dataTypes = `<code>${this.replaceUnsafeStrings(prop.dataType![0] as string)}</code>`;
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

                return [prop.name, dataTypes, des.join('<br /><br />')];
            });

            const table = mdTable([headers, ...rows]);

            propertyString = this.buildTable('Properties', table);
        }

        let methodString = '';

        if (methods.length > 0)
        {
            const headers = ['Name', 'Params', 'Description'];
            const rows = methods.map((method) =>
            {
                // replace all with replacements
                const des = [];

                if (method.brief)
                {
                    des.push(this.replaceUnsafeStrings(htmlToMd.translate(runTagResolver(method.brief))));
                }
                if (method.description)
                {
                    des.push(this.replaceUnsafeStrings(
                        htmlToMd.translate(runTagResolver(method.description)).replaceAll('\n', '<br />')
                    ));
                }

                const params = `<code>${this.replaceUnsafeStrings(this.createSignature(method, false))}</code>`;

                return [method.name, params, des.join('<br /><br />')];
            });

            const table = mdTable([headers, ...rows]);

            methodString = this.buildTable('Methods', table);
        }

        return `## Summary\n${propertyString}\n${methodString}`;
    }

    private buildTable(name: string, table: string)
    {
        return `
<details><summary>${name}</summary>
<p>

${table}

</p>
</details>
    `;
    }

    save(outdir: string)
    {
        const summary = this.getInterfaceSummary();
        const exts = this.getExtends();
        const properties = this.formatProperties(
            this.getMembersOfType<PropertyDoc>('PropertyDoc')
        );
        const methods = this.formatMethods(
            this.getMembersOfType<MethodDoc>('MethodDoc')
        );
        const markdown = `---
id: "${this.mdName}"
title: "Interface: ${this.name}"
sidebar_label: "${this.name}"
custom_edit_url: null
---

${this.getSummary()}

${summary}

${exts}

${properties}

${methods}
  `;

        // ensure the modules directory exists
        fs.mkdirSync(path.join(outdir, 'interfaces'), { recursive: true });
        fs.writeFileSync(
            path.join(outdir, 'interfaces', `${this.mdName}.mdx`),
            markdown
        );
    }
}
