import fs from 'fs';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import path from 'path';
import { Class } from './dist/dataStructures/Class';
import { Enum } from './dist/dataStructures/Enum';
import { Interface } from './dist/dataStructures/Interface';
import { Namespace } from './dist/dataStructures/Namespace';
import { Package } from './dist/dataStructures/Package';
import { markdownTable } from './dist/libs/markdown-table';
import { generateHomePage } from './dist/templates/home';
import { mkdirpSync, traverse, WarnMap } from './dist/utils';

import type {
    ClassDoc,
    Doc,
    EnumDoc,
    EventDoc,
    FunctionDoc,
    InterfaceDoc,
    MethodDoc,
    MixinDoc,
    NSDoc,
    PackageDoc,
    PropertyDoc,
    RootDoc,
    TypedefDoc,
} from '@webdoc/model';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const performance = require('perf_hooks').performance;

interface Options
{
    doctree: RootDoc;
    docDatabase: any;
    config: any;
}

type Global = typeof globalThis & {
    env: any;
};

export type DocData<T = Doc> = {
    doc: T;
    pkg: string;
};

export const htmlToMd = new NodeHtmlMarkdown({
    globalEscape: [/[\\`*~]/gm, '\\$&']
});
export const mdTable = markdownTable;
export const idToDoc = new WarnMap<string, Doc>();

export const packages = new WarnMap<string, Package>();
export const namespaces = new WarnMap<string, Namespace>();
export const enums = new WarnMap<string, Enum>();
export const classes = new WarnMap<string, Class>();
export const interfaces = new WarnMap<string, Interface>();

export const typeDefs = new WarnMap<string, DocData<TypedefDoc>>();
export const events = new WarnMap<string, DocData<EventDoc>>();
export const properties = new WarnMap<string, DocData<PropertyDoc>>();
export const mixins = new WarnMap<string, DocData<MixinDoc>>();
export const methods = new WarnMap<string, DocData<MethodDoc>>();
export const functions = new WarnMap<string, DocData<FunctionDoc>>();

export function publish(options: Options)
{
    const env = options.config;
    const t0 = performance.now();
    const docTree = options.doctree;
    const outdir = path.normalize(env.opts.destination);
    const conf = env.conf.templates || {};

    (global as Global).env = env;
    (global as Global).env.conf = options.config;
    conf.default = conf.default || {};

    mkdirpSync(outdir);

    const data = options.docDatabase;

    data.sort('path, version, since');

    // Traverse the docTree and get all the classes, namespaces, enums, interfaces, and packages
    traverse<Doc>(docTree, 'members', (doc) =>
    {
        if (doc.type === 'RootDoc')
        {
            setPackages(doc);

            return;
        }

        if (doc.access === 'private') return;
        getSavableType(doc as any);
    });

    checkNameDuplicates();
    generateHomePage(outdir);

    // generate packages pages
    packages.forEach((pkg) => pkg.save(outdir));
    interfaces.forEach((int) => int.save(outdir));
    classes.forEach((cls) => cls.save(outdir));
    enums.forEach((enm) => enm.save(outdir));
    namespaces.forEach((ns) => ns.save(outdir));

    fs.writeFileSync(path.join(outdir, 'modules', '_category_.yml'), 'label: Modules\nposition: 1');
    fs.writeFileSync(path.join(outdir, 'namespaces', '_category_.yml'), 'label: Namespaces\nposition: 2');
    fs.writeFileSync(path.join(outdir, 'enums', '_category_.yml'), 'label: Enums\nposition: 3');
    fs.writeFileSync(path.join(outdir, 'interfaces', '_category_.yml'), 'label: Interfaces\nposition: 4');
    fs.writeFileSync(path.join(outdir, 'classes', '_category_.yml'), 'label: Classes\nposition: 5');

    // eslint-disable-next-line no-console
    console.log(`@pixi/webdoc-template took ${Math.ceil(performance.now() - t0)}ms to run!`);
}

function checkNameDuplicates()
{
    const allNames = Array.from([
        ...packages.map((val) => val.mdName),
        ...namespaces.map((val) => val.mdName),
        ...enums.map((val) => val.mdName),
        ...interfaces.map((val) => val.mdName),
        ...classes.map((val) => val.mdName),
    ]);
    const allNamesSet = Array.from(new Set(allNames));

    // check for duplicates
    if (allNames.length !== allNamesSet.length)
    {
        console.warn(allNames.filter((item, index) => allNames.indexOf(item) !== index));
        throw new Error('duplicate names found');
    }
}

function setPackages(doc: RootDoc)
{
    doc.packages.forEach((pkg) =>
    {
        const name = pkg.name.replace('@pixi/', 'pixi_').replaceAll('-', '_');

        idToDoc.set(pkg.id, pkg);
        packages.set(pkg.id, new Package(pkg.name, name, pkg));
    });
}

function getSavableType(doc: PackageDoc | ClassDoc | InterfaceDoc | EnumDoc | NSDoc)
{
    let mapClass: WarnMap<string, Package | Class | Interface | Enum | Namespace>;
    let ClassType: typeof Package | typeof Class | typeof Interface | typeof Enum | typeof Namespace;

    switch (doc.type)
    {
        case 'PackageDoc':
            mapClass = packages;
            ClassType = Package;
            break;
        case 'ClassDoc':
            mapClass = classes;
            ClassType = Class;
            break;
        case 'InterfaceDoc':
            mapClass = interfaces;
            ClassType = Interface;
            break;
        case 'EnumDoc':
            mapClass = enums;
            ClassType = Enum;
            break;
        case 'NSDoc':
            mapClass = namespaces;
            ClassType = Namespace;
            break;
        default:
            return;
    }

    const pkgDoc = doc.loc?.file.package || doc.parent?.loc?.file.package;
    const pkg = packages.get(pkgDoc!.id);
    const namespace = doc.parent?.type === 'NSDoc' ? doc.parent : undefined;
    const fullName = namespace ? `${namespace.name}.${doc.name}` : doc.name;
    const mdName = `${fullName}.${pkg!.mdName}`;

    if (!mdName!)
    {
        throw new Error(`No package found for ${doc.name}`);
    }

    idToDoc.set(doc.id, doc);
    mapClass!.set(doc.id, new ClassType(fullName, mdName, doc as any));
}
