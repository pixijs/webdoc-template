import fs from 'fs';
import path from 'path';
import { classes, enums, interfaces, namespaces } from '../../publish';
import { Base } from './Base';

import type { WarnMap } from '../utils';
import type { DataType } from './Base';
import type { FunctionDoc, PackageDoc, PropertyDoc } from '@webdoc/model';

export class Package extends Base<PackageDoc>
{
    private get<T>(map: WarnMap<string, DataType<T>>, title: string, loc: string)
    {
        const all: string[] = [];

        map.forEach((ns) =>
        {
            // check if class is part of a namespace
            // if it is then you need to add the namespace to the path

            if (ns.mdName.startsWith(this.mdName))
            {
                all.push(`* [${ns.name}](../${loc}/${ns.mdName})`);
            }
        });

        if (all.length === 0)
        {
            return '';
        }

        all.unshift(`## ${title}`);

        return `${all.join('\n')}\n`;
    }

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

    save(outdir: string)
    {
        const nsData = this.get(namespaces, 'Namespaces', 'namespaces');
        const enumData = this.get(enums, 'Enums', 'enums');
        const classData = this.get(classes, 'Classes', 'classes');
        const interfaceData = this.get(interfaces, 'Interfaces', 'interfaces');
        const props = this.getProperties();
        const funcs = this.getFunctions();

        // TODO: get typedefs
        // TODO: get functions
        // TODO: get variables
        // TODO: get events

        const allData = nsData + enumData + classData + interfaceData + props + funcs;
        const markdown = `---
id: "${this.mdName}"
title: "Module: ${this.name}"
sidebar_label: "${this.name}"
sidebar_position: 0
custom_edit_url: null
---
${allData}
    `;

        // ensure the modules directory exists
        fs.mkdirSync(path.join(outdir, 'modules'), { recursive: true });
        fs.writeFileSync(path.join(outdir, 'modules', `${this.mdName}.mdx`), markdown);
    }
}
