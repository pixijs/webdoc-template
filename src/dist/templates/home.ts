import fs from 'fs';
import path from 'path';
import { packages } from '../../publish';

export function generateHomePage(outdir: string)
{
    const packageList = Array.from(packages.keys())
        .map((id) =>
        {
            const pkg = packages.get(id);

            return `* [${pkg?.name}](./api/modules/${pkg?.mdName})`;
        })
        .join(`\n`);

    const markdown = `---
id: "index"
title: "PixiJS API Reference"
sidebar_label: "Exports"
sidebar_position: 0.5
custom_edit_url: null
---
# PixiJS API Reference
## Packages
${packageList}
    `;

    fs.writeFileSync(path.join(outdir, 'index.mdx'), markdown);
    fs.writeFileSync(path.join(outdir, '_category_.yml'), 'label: API');
}
