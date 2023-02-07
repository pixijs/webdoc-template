"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publish = exports.functions = exports.methods = exports.mixins = exports.properties = exports.events = exports.typeDefs = exports.interfaces = exports.classes = exports.enums = exports.namespaces = exports.packages = exports.idToDoc = exports.mdTable = exports.htmlToMd = void 0;
const fs_1 = __importDefault(require("fs"));
const node_html_markdown_1 = require("node-html-markdown");
const path_1 = __importDefault(require("path"));
const Class_1 = require("./dist/dataStructures/Class");
const Enum_1 = require("./dist/dataStructures/Enum");
const Interface_1 = require("./dist/dataStructures/Interface");
const Namespace_1 = require("./dist/dataStructures/Namespace");
const Package_1 = require("./dist/dataStructures/Package");
const markdown_table_1 = require("./dist/libs/markdown-table");
const home_1 = require("./dist/templates/home");
const utils_1 = require("./dist/utils");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const performance = require('perf_hooks').performance;
exports.htmlToMd = new node_html_markdown_1.NodeHtmlMarkdown({
    globalEscape: [/[\\`*~]/gm, '\\$&']
});
exports.mdTable = markdown_table_1.markdownTable;
exports.idToDoc = new utils_1.WarnMap();
exports.packages = new utils_1.WarnMap();
exports.namespaces = new utils_1.WarnMap();
exports.enums = new utils_1.WarnMap();
exports.classes = new utils_1.WarnMap();
exports.interfaces = new utils_1.WarnMap();
exports.typeDefs = new utils_1.WarnMap();
exports.events = new utils_1.WarnMap();
exports.properties = new utils_1.WarnMap();
exports.mixins = new utils_1.WarnMap();
exports.methods = new utils_1.WarnMap();
exports.functions = new utils_1.WarnMap();
function publish(options) {
    const env = options.config;
    const t0 = performance.now();
    const docTree = options.doctree;
    const outdir = path_1.default.normalize(env.opts.destination);
    const conf = env.conf.templates || {};
    global.env = env;
    global.env.conf = options.config;
    conf.default = conf.default || {};
    (0, utils_1.mkdirpSync)(outdir);
    const data = options.docDatabase;
    data.sort('path, version, since');
    // Traverse the docTree and get all the classes, namespaces, enums, interfaces, and packages
    (0, utils_1.traverse)(docTree, 'members', (doc) => {
        if (doc.type === 'RootDoc') {
            setPackages(doc);
            return;
        }
        if (doc.access === 'private')
            return;
        getSavableType(doc);
    });
    checkNameDuplicates();
    (0, home_1.generateHomePage)(outdir);
    // generate packages pages
    exports.packages.forEach((pkg) => pkg.save(outdir));
    exports.interfaces.forEach((int) => int.save(outdir));
    exports.classes.forEach((cls) => cls.save(outdir));
    exports.enums.forEach((enm) => enm.save(outdir));
    exports.namespaces.forEach((ns) => ns.save(outdir));
    fs_1.default.writeFileSync(path_1.default.join(outdir, 'modules', '_category_.yml'), 'label: Modules\nposition: 1');
    fs_1.default.writeFileSync(path_1.default.join(outdir, 'namespaces', '_category_.yml'), 'label: Namespaces\nposition: 2');
    fs_1.default.writeFileSync(path_1.default.join(outdir, 'enums', '_category_.yml'), 'label: Enums\nposition: 3');
    fs_1.default.writeFileSync(path_1.default.join(outdir, 'interfaces', '_category_.yml'), 'label: Interfaces\nposition: 4');
    fs_1.default.writeFileSync(path_1.default.join(outdir, 'classes', '_category_.yml'), 'label: Classes\nposition: 5');
    // eslint-disable-next-line no-console
    console.log(`@pixi/webdoc-template took ${Math.ceil(performance.now() - t0)}ms to run!`);
}
exports.publish = publish;
function checkNameDuplicates() {
    const allNames = Array.from([
        ...exports.packages.map((val) => val.mdName),
        ...exports.namespaces.map((val) => val.mdName),
        ...exports.enums.map((val) => val.mdName),
        ...exports.interfaces.map((val) => val.mdName),
        ...exports.classes.map((val) => val.mdName),
    ]);
    const allNamesSet = Array.from(new Set(allNames));
    // check for duplicates
    if (allNames.length !== allNamesSet.length) {
        console.warn(allNames.filter((item, index) => allNames.indexOf(item) !== index));
        throw new Error('duplicate names found');
    }
}
function setPackages(doc) {
    doc.packages.forEach((pkg) => {
        const name = pkg.name.replace('@pixi/', 'pixi_').replaceAll('-', '_');
        exports.idToDoc.set(pkg.id, pkg);
        exports.packages.set(pkg.id, new Package_1.Package(pkg.name, name, pkg));
    });
}
function getSavableType(doc) {
    let mapClass;
    let ClassType;
    switch (doc.type) {
        case 'PackageDoc':
            mapClass = exports.packages;
            ClassType = Package_1.Package;
            break;
        case 'ClassDoc':
            mapClass = exports.classes;
            ClassType = Class_1.Class;
            break;
        case 'InterfaceDoc':
            mapClass = exports.interfaces;
            ClassType = Interface_1.Interface;
            break;
        case 'EnumDoc':
            mapClass = exports.enums;
            ClassType = Enum_1.Enum;
            break;
        case 'NSDoc':
            mapClass = exports.namespaces;
            ClassType = Namespace_1.Namespace;
            break;
        default:
            return;
    }
    const pkgDoc = doc.loc?.file.package || doc.parent?.loc?.file.package;
    const pkg = exports.packages.get(pkgDoc.id);
    const namespace = doc.parent?.type === 'NSDoc' ? doc.parent : undefined;
    const fullName = namespace ? `${namespace.name}.${doc.name}` : doc.name;
    const mdName = `${fullName}.${pkg.mdName}`;
    if (!mdName) {
        throw new Error(`No package found for ${doc.name}`);
    }
    exports.idToDoc.set(doc.id, doc);
    mapClass.set(doc.id, new ClassType(fullName, mdName, doc));
}
