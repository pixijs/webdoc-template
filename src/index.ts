import { copyFileSync, mkdirSync, promises as fsp, readFileSync } from 'fs';
import { outputFile } from 'fs-extra';
import { has } from 'lodash';
import {
    basename,
    dirname,
    join,
    normalize,
    parse,
    relative,
    resolve,
} from 'path';
import { performance } from 'perf_hooks';
import {
    FONT_NAMES,
    PRETTIFIER_CSS_FILES,
    PRETTIFIER_SCRIPT_FILES,
} from './utils/consts';
import { getMembers, linker, toAttributes } from './utils/helper';
import { initLogger } from './utils/logs';
import { buildNavigation } from './utils/navigation';
import { overrideTemplateRenderer, toHtmlSafeString } from './utils/overrides';
import { needsSignature, SignatureBuilder } from './utils/signature';

const {
    TemplateRenderer,
    RelationsPlugin,
    TemplatePipeline,
    TemplateTagsResolver,
} = require('@webdoc/template-library');
const {
    isClass,
    isInterface,
    isNamespace,
    isMixin,
    isModule,
    isExternal,
    traverse,
} = require('@webdoc/model');
const commonPathPrefix = require('common-path-prefix');
const klawSync = require('klaw-sync');

const publishLog = initLogger();

overrideTemplateRenderer();

let docDatabase: any;
let env: any;
let data: any;
let pipeline: any;
let view: any;
let outdir: any;

function lsSync(dir: string, opts: any = {}): string[]
{
    const depth = has(opts, 'depth') ? opts.depth : -1;

    const files = klawSync(dir, {
        depthLimit: depth,
        filter: (f: any) => !basename(f.path).startsWith('.'),
        nodir: true,
    });

    return files.map((f: any) => f.path);
}

function mkdirpSync(filepath: string)
{
    return mkdirSync(filepath, { recursive: true });
}

/**
 * Generate the HTML file with the documentation of all docs
 */
function generate(title: any, docs: any, filename: any)
{
    const docData = {
        env,
        title,
        docs,
        fileName: filename,
    };
    const outpath = join(outdir, filename);
    const html = pipeline.render('container.tmpl', docData);

    // We don't except to write on this file again (or do we?)
    outputFile(outpath, html, 'utf8', (error) =>
    {
        if (error)
        {
            console.error(`Couldn't save ${outpath} because ${error}`);
        }
    });
}

function generateSourceFiles(sourceFiles: any, encoding: any = 'utf8')
{
    Object.keys(sourceFiles).forEach((file) =>
    {
        let source;
        // links are keyed to the shortened path in each doclet's `meta.shortpath` property
        const sourceOutfile = linker.createURI(sourceFiles[file].shortened);

        // Hack query cache point source file to URI
        linker.queryCache.set(sourceFiles[file].resolved, sourceOutfile);

        try
        {
            source = {
                type: 'sourceFile',
                code: toHtmlSafeString(
                    readFileSync(sourceFiles[file].resolved, encoding)
                ),
            };
        }
        catch (e: any)
        {
            publishLog.error(
                'SourceFile',
                `Error while generating source file ${file}: ${e.message}`
            );
        }

        generate(
            `Source: ${sourceFiles[file].shortened}`,
            [source],
            sourceOutfile
        );
    });
}

function find(spec: any)
{
    return data(spec).get();
}

function addAttribs(f: any)
{
    const attribs = toAttributes(f);

    if (attribs.length)
    {
        f.attribs = '';
        attribs.forEach((a: any) =>
        {
            f.attribs
                += `<span class="access-signature">${
                    toHtmlSafeString(a)
                }</span>`;
        });
    }
}

function shortenPaths(files: any, commonPrefix: any)
{
    Object.keys(files).forEach((file) =>
    {
        files[file].shortened = files[file].resolved
            .replace(commonPrefix, '')
        // always use forward slashes
            .replace(/\\/g, '/');
    });

    return files;
}

function getPathFromDoclet({ meta }: any)
{
    if (!meta)
    {
        return null;
    }

    return meta.path && meta.path !== 'null'
        ? join(meta.path, meta.filename)
        : meta.filename;
}

/**
 * Look for classes or functions with the same name as modules (which indicates that the module
 * exports only that class or function), then attach the classes or functions to the `module`
 * property of the appropriate module doclets. The name of each class or function is also updated
 * for display purposes. This function mutates the original arrays.
 *
 * @private
 * @param {Array.<module:jsdoc/doclet.Doclet>} doclets - The array of classes and functions to
 * check.
 * @param {Array.<module:jsdoc/doclet.Doclet>} modules - The array of module doclets to search.
 */
// function attachModuleSymbols(doclets: any, modules: any) {
//   const symbols: any = {};

//   // build a lookup table
//   doclets.forEach((symbol: any) => {
//     symbols[symbol.longname] = symbols[symbol.longname] || [];
//     symbols[symbol.longname].push(symbol);
//   });

//   modules.forEach((module: any) => {
//     if (symbols[module.longname]) {
//       module.modules = symbols[module.longname]
//         // Only show symbols that have a description. Make an exception for classes, because
//         // we want to show the constructor-signature heading no matter what.
//         .filter(({description, kind}: any) => description || kind === "class")
//         .map((symbol: any) => {
//           symbol = cloneDeep(symbol);

//           if (symbol.kind === "class" || symbol.kind === "function") {
//             symbol.name = `${symbol.name.replace("module:", "(require(\"")}"))`;
//           }

//           return symbol;
//         });
//     }
//   });
// }

function sourceToDestination(parentDir: any, sourcePath: any, destDir: any)
{
    const relativeSource = relative(parentDir, sourcePath);

    return resolve(join(destDir, relativeSource));
}

export function publish(options: any)
{
    const t0 = performance.now();
    const docTree = options.doctree;

    docDatabase = options.docDatabase;
    const opts = options.opts;
    const manifest = options.manifest;
    const userConfig = (global as any).Webdoc.userConfig;

    env = options.config;

    (global as any).env = env;
    (global as any).env.conf = options.config;

    outdir = normalize(env.opts.destination);

    const sourceFilePaths: any = [];
    let sourceFiles: any = {};
    let staticFiles;

    data = docDatabase;

    const conf = env.conf.templates || {};

    conf.default = conf.default || {};

    const templatePath = __dirname;

    view = new TemplateRenderer(
        join(templatePath, 'tmpl'),
        docDatabase,
        docTree
    );
    view.installPlugin('relations', RelationsPlugin);
    view.installPlugin('linker', linker);
    view.plugins.relations.buildRelations();

    view.linkto = view.linkTo;

    pipeline = new TemplatePipeline(view);
    pipeline.pipe(new TemplateTagsResolver());

    // Reserve special files
    const indexUrl = linker.createURI('index');
    const globalUrl = linker.createURI('global');

    // set up templating
    view.layout = conf.default.layoutFile
        ? resolve(conf.default.layoutFile)
        : 'layout.tmpl';

    // set up tutorials for helper
    // helper.setTutorials(tutorials);

    // data = helper.prune(data);
    data.sort('path, version, since');
    // helper.addEventListeners(data);

    const idToDoc = new Map();

    traverse(docTree, (doc: any) =>
    {
        if (doc.type === 'RootDoc')
        {
            doc.packages.forEach((pkg: any) =>
            {
                idToDoc.set(pkg.id, pkg);
            });
        }
        idToDoc.set(doc.id, doc);
    });

    data().each((doclet: any) =>
    {
        let sourcePath;

        doclet.attribs = '';

        if (doclet.see)
        {
            doclet.see.forEach((seeItem: any, i: any) =>
            {
                doclet.see[i] = linker.linkTo(seeItem);
            });
        }

        // build a list of source files
        if (doclet.loc)
        {
            sourcePath = doclet.loc.fileName;
            sourceFiles[sourcePath] = {
                resolved: sourcePath,
                shortened: null,
            };
            if (!sourceFilePaths.includes(sourcePath))
            {
                sourceFilePaths.push(sourcePath);
            }
        }
    });

    // update outdir if necessary, then create outdir
    const packageInfo = (find({ kind: 'package' }) || [])[0];

    if (packageInfo && packageInfo.name)
    {
        outdir = join(outdir, packageInfo.name, packageInfo.version || '');
    }
    mkdirpSync(outdir);

    // copy the template's static files to outdir
    const fromDir = join(templatePath, 'static');

    staticFiles = lsSync(fromDir);

    staticFiles.forEach((fileName: any) =>
    {
        const toPath = sourceToDestination(fromDir, fileName, outdir);

        mkdirpSync(dirname(toPath));
        copyFileSync(fileName, toPath);
    });

    // copy the fonts used by the template to outdir
    staticFiles = lsSync(
        join(require.resolve('open-sans-fonts'), '..', 'open-sans')
    );

    staticFiles.forEach((fileName: any) =>
    {
        const toPath = join(outdir, 'fonts', basename(fileName));

        if (FONT_NAMES.includes(parse(fileName).name))
        {
            mkdirpSync(dirname(toPath));
            copyFileSync(fileName, toPath);
        }
    });

    // copy the prettify script to outdir
    PRETTIFIER_SCRIPT_FILES.forEach((fileName) =>
    {
        const toPath = join(outdir, 'scripts', basename(fileName));

        copyFileSync(
            join(require.resolve('code-prettify'), '..', fileName),
            toPath
        );
    });

    // copy the prettify CSS to outdir
    PRETTIFIER_CSS_FILES.forEach((fileName) =>
    {
        const toPath = join(outdir, 'styles', basename(fileName));

        copyFileSync(
            require.resolve(
                `color-themes-for-google-code-prettify/dist/themes/${fileName}`
            ),
            toPath
        );
    });

    // copy user-specified static files to outdir
    /* if (conf.default.staticFiles) {
    // The canonical property name is `include`. We accept `paths` for backwards compatibility
    // with a bug in JSDoc 3.2.x.
    staticFilePaths = conf.default.staticFiles.include ||
            conf.default.staticFiles.paths ||
            [];
    staticFileFilter = new (require("jsdoc/src/filter").Filter)(conf.default.staticFiles);
    staticFileScanner = new (require("jsdoc/src/scanner").Scanner)();
    cwd = process.cwd();

    staticFilePaths.forEach((filePath) => {
      let extraStaticFiles;

      filePath = resolve(cwd, filePath);
      extraStaticFiles = staticFileScanner.scan([filePath], 10, staticFileFilter);

      extraStaticFiles.forEach((fileName) => {
        const toPath = sourceToDestination(fromDir, fileName, outdir);

        mkdirpSync(dirname(toPath));
        copyFileSync(fileName, toPath);
      });
    });
  }*/

    if (sourceFilePaths.length)
    {
        sourceFiles = shortenPaths(
            sourceFiles,
            commonPathPrefix(sourceFilePaths)
        );
    }

    // Create a hyperlink for each documented symbol.
    data().each((doclet: any) =>
    {
        let docletPath;
        const uri = linker.getURI(doclet);

        if (manifest && doclet.id)
        {
            if (!manifest.registry[doclet.id])
            {
                manifest.registry[doclet.id] = {};
            }

            manifest.registry[doclet.id].uri = uri;
        }

        // Make the query-cache hot for all document paths
        // linker.linkTo(doclet.path);

        // add a shortened version of the full path
        if (doclet.meta)
        {
            docletPath = getPathFromDoclet(doclet);
            docletPath = sourceFiles[docletPath].shortened;
            if (docletPath)
            {
                doclet.meta.shortpath = docletPath;
            }
        }
    });

    data().each((doc: any) =>
    {
    // Add signature information to the doc
        if (needsSignature(doc))
        {
            SignatureBuilder.appendParameters(doc);
            SignatureBuilder.appendReturns(doc);
            addAttribs(doc);
        }
    });

    // Link doc ancestors & finish up signatures! (after URL generation)
    data().each((doc: any) =>
    {
        doc.ancestors = linker.linksToAncestors(doc);

        if (doc.type === 'PropertyDoc' || doc.type === 'EnumDoc')
        {
            SignatureBuilder.appendType(doc);
            addAttribs(doc);
        }
    });

    const members = getMembers(docTree);
    // members.tutorials = tutorials;
    // tutorials.forEach((t: any) => generateTutorialLinks(t));

    // output pretty-printed source files by default
    const outputSourceFiles = userConfig.template.outputSourceFiles;
    // once for all

    view.nav = buildNavigation(members);
    // attachModuleSymbols( find({longname: {left: "module:"}}), members.modules );

    // generate the pretty-printed source files first so other pages can link to them
    if (outputSourceFiles)
    {
        generateSourceFiles(sourceFiles, opts.encoding);
    }

    if (members.globals.length)
    {
        generate('Global', [{ kind: 'globalobj' }], globalUrl);
    }

    generateHomePage(indexUrl, docTree);

    for (const [id, docRecord] of linker.documentRegistry)
    {
        let doc;

        try
        {
            doc = idToDoc.get(id);
        }
        catch (e)
        {
            console.error(`${id} corrupted into idToDoc map, how?`);
            continue;
        }

        if (doc && doc.access !== 'private' && !doc.ignore)
        {
            const docUrl = docRecord.uri;

            if (isClass(doc))
            {
                generate(`Class: ${doc.name}`, [doc], docUrl);
            }
            else if (isInterface(doc))
            {
                generate(`Interface: ${doc.name}`, [doc], docUrl);
            }
            else if (isNamespace(doc))
            {
                generate(`Namespace: ${doc.name}`, [doc], docUrl);
            }
            else if (isMixin(doc))
            {
                generate(`Mixin: ${doc.name}`, [doc], docUrl);
            }
            else if (isModule(doc))
            {
                generate(`Module: ${doc.name}`, [doc], docUrl);
            }
            else if (isExternal(doc))
            {
                generate(`External: ${doc.name}`, [doc], docUrl);
            }
        }
    }

    console.log(
        `@pixi/webdoc-template took ${Math.ceil(
            performance.now() - t0
        )}ms to run!`
    );

    /*

  // TODO: move the tutorial functions to templateHelper.js
  function generateTutorial(title, tutorial, filename) {
    const tutorialData = {
      title: title,
      header: tutorial.title,
      content: tutorial.parse(),
      children: tutorial.children,
    };
    const tutorialPath = join(outdir, filename);
    let html = pipeline.render("tutorial.tmpl", tutorialData);

    // yes, you can use {@link} in tutorials too!
    html = helper.resolveLinks(html); // turn {@link foo} into <a href="foodoc.html">foo</a>

    writeFileSync(tutorialPath, html, "utf8");
  }

  // tutorials can have only one parent so there is no risk for loops
  function saveChildren({children}) {
    children.forEach((child) => {
      generateTutorial(`Tutorial: ${child.title}`, child, helper.tutorialToUrl(child.name));
      saveChildren(child);
    });
  }

  saveChildren(tutorials);*/
}

/**
 * Generate the home page, this loads the top-level members, packages, and README
 */
async function generateHomePage(
    pagePath: any /* : string */,
    rootDoc: any /* : RootDoc */
)
{
    /* : void */
    const userConfig = (global as any).Webdoc.userConfig;

    // index page displays information from package.json and lists files
    const files = docDatabase({ kind: 'file' }).get();
    const packages = docDatabase({ type: 'PackageDoc' }).get();

    const arr = rootDoc.members.filter(
        (doc: any) =>
            doc.type === 'FunctionDoc'
            || doc.type === 'EnumDoc'
            || doc.type === 'MethodDoc'
            || doc.type === 'PropertyDoc'
            || doc.type === 'TypedefDoc'
    );

    const readme = userConfig.template.readme;
    let readmeContent = '';

    if (readme)
    {
        const readmePath = join(process.cwd(), readme);

        readmeContent = await fsp.readFile(readmePath, 'utf8');

        const markdownRenderer = require('markdown-it')({
            breaks: false,
            html: true,
        }).use(require('markdown-it-highlightjs'));

        readmeContent = markdownRenderer.render(readmeContent);
    }

    generate(
        'Home',
        packages
            .concat([
                {
                    type: 'mainPage',
                    readme: readmeContent,
                    path: userConfig.template.mainPage.title,
                    children: arr,
                    members: arr,
                },
            ])
            .concat(files),
        pagePath
    );
}

// --------------- CURRENTLY UNUSED - TO BE IMPLEMENTED ---------------

// type Tutorial = {
//   title: string,
//   content: string,
//   children: Tutorial[]
// }

// function tutoriallink(tutorial: any) {
//   return helper.toTutorial(tutorial, null, {
//     tag: "em",
//     classname: "disabled",
//     prefix: "Tutorial: ",
//   });
// }

// async function generateTutorial(
//   title: any /*: string */,
//   tutorial: any /*: string */,
//   filename: any /*: string */
// ) {
//   const tutorialData = {
//     title: title,
//     header: tutorial.title,
//     content: tutorial.parse(),
//     children: tutorial.children,
//   };

//   const tutorialPath = join(outdir, filename);
//   const html = pipeline.render("tutorial.tmpl", tutorialData);
//   writeFileSync(tutorialPath, html, "utf8");
// }

// function generateTutorialLinks(tutorial: any /*: TutorialDoc */) {
//   if (!tutorial) {
//     return;
//   }

//   linker.getURI(tutorial);

//   tutorial.members.forEach((child: any) => {
//     generateTutorialLinks(child);
//   });
// }

// function linktoTutorial(longName: any, name: any) {
//   return tutoriallink(name);
// }

// function linktoExternal(longName: any, name: any) {
//   return linkTo(longName, name.replace(/(^"|"$)/g, ""));
// }
