import fs from 'fs';
import path from 'path';
import { classes, enums, interfaces } from '../../publish';
import { Base } from './Base';

import type { WarnMap } from '../utils';
import type { DocType, FunctionDoc, NSDoc, PropertyDoc } from '@webdoc/model';

export class Namespace extends Base<NSDoc>
{
    private getProperties()
    {
        const props = [...this.doc.members].filter((member) =>
            member.type === 'PropertyDoc' && member.access !== 'private'
        ) as PropertyDoc[];

        return this.formatProperties(props);
    }

    private getFunctions()
    {
        const funcs = [...this.doc.members].filter((member) =>
            member.type === 'FunctionDoc' && member.access !== 'private'
        ) as FunctionDoc[];

        return this.formatMethods(funcs, '## Functions');
    }

    private getList(type: DocType, map: WarnMap<string, Base<any>>, name: string)
    {
        const typeMap: Partial<Record<DocType, string>> = {
            ClassDoc: 'classes',
            InterfaceDoc: 'interfaces',
            EnumDoc: 'enums',
        };

        const cls = this.getMembersOfType(type);

        let string: string[] = [];

        if (cls.length > 0)
        {
            string = cls.map((cls) =>
            {
                // check if class is part of a namespace
                // if it is then you need to add the namespace to the path
                const name = cls.parent?.type === 'NSDoc' ? `${cls.parent.name}.${cls.name}` : cls.name;
                const mappedClass = map.find((c) => c.name === name);

                return `* [${name}](../${typeMap[type]}/${mappedClass!.mdName})`;
            });
            string.unshift(`## ${name}`);
        }

        return string.join('\n');
    }

    save(outdir: string)
    {
        const cl = this.getList('ClassDoc', classes, 'Classes');
        const int = this.getList('InterfaceDoc', interfaces, 'Interfaces');
        const en = this.getList('EnumDoc', enums, 'Enums');
        const funcs = this.getFunctions();
        const props = this.getProperties();
        const markdown = `---
id: "${this.mdName}"
title: "Namespace: ${this.name}"
sidebar_label: "${this.name}"
custom_edit_url: null
---

${this.getSummary()}

${cl}

${int}

${en}

${props}

${funcs}


    `;

        // ensure the modules directory exists
        fs.mkdirSync(path.join(outdir, 'namespaces'), { recursive: true });
        fs.writeFileSync(
            path.join(outdir, 'namespaces', `${this.mdName}.mdx`),
            markdown
        );
    }
}
