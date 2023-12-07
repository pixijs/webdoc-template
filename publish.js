// @flow
// TODO: Add flow syntax types

const _ = require("lodash");
const commonPathPrefix = require("common-path-prefix");
const fs = require("fs");
const path = require("path");
// const {taffy} = require("taffydb");
const helper = require("./helper");
const hasOwnProp = Object.prototype.hasOwnProperty;
const {
  TemplateRenderer,
  RelationsPlugin,
  TemplatePipeline,
  TemplateTagsResolver, // <<TemplatePipelineElement>>
} = require("@webdoc/template-library");
const performance = require("perf_hooks").performance;
const {
  isClass,
  isInterface,
  isNamespace,
  isMixin,
  isModule,
  isExternal,
  traverse,
} = require("@webdoc/model");
const fsp = require("fs").promises;
const fse = require("fs-extra");

const {linker} = helper;

TemplateRenderer.prototype.resolveDocLink = function(docLink) {
  if (typeof docLink === "string") {
    return this.linkTo(docLink, docLink);
  }

  return this.linkTo(docLink.path, docLink.path);
};

let randomDice = 0;

const htmlsafe = TemplateRenderer.prototype.htmlsafe = (str) => {
  if (typeof str !== "string") {
    str = String(str);
  }

  return str.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;");
};

TemplateRenderer.prototype.toHtmlSafe = htmlsafe;
TemplateRenderer.prototype.generateRandomID = () => `${randomDice++}`;

const {Log, LogLevel, tag} = require("missionlog");

const linkto = (...args) => linker.linkTo(...args);
const removeParentalPrefix = (symbolPath) => symbolPath.replace(/.*[.#](.*)$/, "$1");
const linkToDataType = (dataType) => {
  const out = linker.linkTo(dataType);
  // Remove the parental prefixes from the label within the <a> tag (eg. 'scene.', 'Container#', etc.)
  return out.replace(/<a href="([^"]+)">[^<]*(\.|#)([^.<#]+)<\/a>/g, "<a href=\"$1\">$3</a>");
};
const linkToSymbolPath = (symbolPath, path = symbolPath) => {
  const extracted = removeParentalPrefix(path);
  // Remove the parental prefixes from the link text (eg. 'scene.', 'Container#', etc.).
  return linker.linkTo(symbolPath, extracted);
};
TemplateRenderer.prototype.removeParentalPrefix = removeParentalPrefix;
TemplateRenderer.prototype.linkToDataType = linkToDataType;
TemplateRenderer.prototype.linkToSymbolPath = linkToSymbolPath;

function isValidUrl(string) {
  try {
    new URL(string);
  } catch (_) {
    return false;
  }

  return true;
}

function matchTextPrefix(content, tagStart) {
  const index = tagStart - 1;

  if (content.charAt(index) !== "]") {
    return;
  }

  let bracketDepth = 1;
  let openIndex = -1;

  for (let i = index - 1; i >= 0; i--) {
    const char = content.charAt(i);

    if (char === "[") {
      --bracketDepth;

      if (bracketDepth === 0) {
        openIndex = i;
        break;
      }
    } else if (char === "]") {
      ++bracketDepth;
    }
  }

  if (openIndex === -1) {
    return;
  }

  const result = [content.slice(openIndex, index + 1)];
  result.index = openIndex;
  return result;
}

// Overriding the default runLinkTag to use renderer.linkToSymbolPath instead of renderer.linkTo function.
// This is in order to automatically remove all the parental prefixes from any {@link} tag on the docs.
TemplateTagsResolver.prototype.runLinkTag = function(input) {
  const linkPattern = /{@link ([^|\s}]*)([\s|])?([^}]*)}/g;
  let linkMatch = linkPattern.exec(input);

  while (linkMatch) {
    const linkTextMatch = matchTextPrefix(input, linkMatch.index);
    const link = linkMatch[1];
    const linkName = linkMatch[3];
    const linkText = linkTextMatch ? linkTextMatch[0].slice(1, -1) : linkName || link;
    let replaced;

    if (isValidUrl(link)) {
      replaced = `<a ${this.linkClass ? "class=\"" + this.linkClass + "\"" : ""}` + `href="${link}">${linkText}</a>`;
    } else {
      replaced = this.renderer.linkToSymbolPath(link, linkText);
    }

    const startIndex = linkTextMatch ? linkTextMatch.index : linkMatch.index;
    const endIndex = linkMatch.index + linkMatch[0].length;
    input = input.slice(0, startIndex) + replaced + input.slice(endIndex);
    linkMatch = linkPattern.exec(input);
  }

  return input;
};

const klawSync = require("klaw-sync");

let publishLog;
let docDatabase;

lsSync = ((dir, opts = {}) => {
  const depth = _.has(opts, "depth") ? opts.depth : -1;

  const files = klawSync(dir, {
    depthLimit: depth,
    filter: ((f) => !path.basename(f.path).startsWith(".")),
    nodir: true,
  });

  return files.map((f) => f.path);
});

let env;

const FONT_NAMES = [
  "OpenSans-Bold",
  "OpenSans-BoldItalic",
  "OpenSans-Italic",
  "OpenSans-Light",
  "OpenSans-LightItalic",
  "OpenSans-Regular",
];
const PRETTIFIER_CSS_FILES = [
  "tomorrow.min.css",
];
const PRETTIFIER_SCRIPT_FILES = [
  "lang-css.js",
  "prettify.js",
];

let data;

let pipeline;
let view;

let outdir;

function mkdirpSync(filepath) {
  return fs.mkdirSync(filepath, {recursive: true});
}

function find(spec) {
  return data(spec).get();
}

function tutoriallink(tutorial) {
  return helper.toTutorial(tutorial, null, {
    tag: "em",
    classname: "disabled",
    prefix: "Tutorial: ",
  });
}

/*::
type Signature = {
  params: [Param],
  returns: [Return]
}
*/

function needsSignature(doc /*: Doc */) /*: boolean */ {
  // Functions, methods, and properties always have signatures.
  if (doc.type === "FunctionDoc" || doc.type === "MethodDoc") {
    return true;
  }
  // Class constructors documented as classes have signatures.
  if (doc.type === "ClassDoc" && doc.params) {
    return true;
  }

  // TODO: Need to resolve this one!
  /*
  // Typedefs containing functions have signatures.
  if (doc.type === "TypedefDoc" && doc.of && type.names &&
        type.names.length) {
    for (let i = 0, l = type.names.length; i < l; i++) {
      if (type.names[i].toLowerCase() === "function") {
        return true;
      }
    }
  }*/

  return false;
}

const SignatureBuilder = {
  appendParameters(doc /*: Doc */) {
    const params = doc.params;

    if (!params) {
      return;
    }

    const paramTypes = params
      .filter((param) => param.identifier && !param.identifier.includes("."))
      .map(
        (item) => {
          let itemName = item.identifier || "";

          if (item.variadic) {
            itemName = `&hellip;${itemName}`;
          }

          return itemName;
        });

    let paramTypesString = "";

    if (paramTypes.length) {
      paramTypesString = paramTypes.join(", ");
    }

    doc.signature = `${doc.signature || ""}(${paramTypesString})`;
  },
  appendReturns(doc /*: Doc */) {
    const returns = doc.returns || doc.yields;

    if (!returns) {
      return;
    }

    let returnTypes = [];
    let returnTypesString = "";

    returnTypes = returns.map((ret) => linkToDataType(ret.dataType));

    if (returnTypes.length) {
      returnTypesString = ` ${returnTypes.join("|")}`;
    }

    doc.signature = `<span class="signature">${doc.signature || ""}</span>` +
          `<span class="type-signature">${returnTypesString}</span>`;
  },
  appendType(doc /*: Doc */) {
    const types = doc.dataType ? linkToDataType(doc.dataType) : "";

    doc.signature = `${doc.signature || ""}<span class="type-signature">${types}</span>`;
  },
};

function addAttribs(f) {
  const attribs = helper.Attributes(f);

  if (attribs.length) {
    f.attribs = "";
    attribs.forEach(function(a) {
      f.attribs += "<span class=\"access-signature\">" + htmlsafe(a) + "</span>";
    });
  }
}

function shortenPaths(files, commonPrefix) {
  Object.keys(files).forEach((file) => {
    files[file].shortened = files[file].resolved.replace(commonPrefix, "")
    // always use forward slashes
      .replace(/\\/g, "/");
  });

  return files;
}

function getPathFromDoclet({meta}) {
  if (!meta) {
    return null;
  }

  return meta.path && meta.path !== "null" ?
    path.join(meta.path, meta.filename) :
    meta.filename;
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
function attachModuleSymbols(doclets, modules) {
  const symbols = {};

  // build a lookup table
  doclets.forEach((symbol) => {
    symbols[symbol.longname] = symbols[symbol.longname] || [];
    symbols[symbol.longname].push(symbol);
  });

  modules.forEach((module) => {
    if (symbols[module.longname]) {
      module.modules = symbols[module.longname]
      // Only show symbols that have a description. Make an exception for classes, because
      // we want to show the constructor-signature heading no matter what.
        .filter(({description, kind}) => description || kind === "class")
        .map((symbol) => {
          symbol = _.cloneDeep(symbol);

          if (symbol.kind === "class" || symbol.kind === "function") {
            symbol.name = `${symbol.name.replace("module:", "(require(\"")}"))`;
          }

          return symbol;
        });
    }
  });
}

function buildMemberNav(items, itemHeading, itemsSeen, linktoFn) {
  let nav = "";

  if (items.length) {
    let itemsNav = "";

    items.forEach((item) => {
      let displayName;

      if ( !hasOwnProp.call(item, "path") ) {
        itemsNav += `<li>${linktoFn("", item.name)}</li>`;
      } else if ( !hasOwnProp.call(itemsSeen, item.path) ) {
        if (env.conf.templates.default.useLongnameInNav) {
          displayName = item.path;
        } else {
          displayName = item.name;
        }
        publishLog.warn(tag.ContentBar, "Linking " + item.path);
        itemsNav += `<li>${linktoFn(item.path, displayName.replace(/\b(module|event):/g, ""))}</li>`;// eslint-disable-line max-len

        itemsSeen[item.path] = true;
      }
    });

    if (itemsNav !== "") {
      nav += `<h3>${itemHeading}</h3><ul>${itemsNav}</ul>`;
    }
  }

  return nav;
}

function linktoTutorial(longName, name) {
  return tutoriallink(name);
}

function linktoExternal(longName, name) {
  return linkto(longName, name.replace(/(^"|"$)/g, ""));
}

/*::
type Navigable = {
  type: "class" | "global" | "namespace",
  name: string,
  path: string,
  deprecated: boolean,
  classes: ClassDoc[],
  events: EventDoc[],
  interfaces: InterfaceDoc[]
  methods: MethodDoc[],
  typedef: TypedefDoc[],
  enums: EnumDoc[]
}
*/

// Represents an entry into the global navigation bar
function Navigable(
  doc /*: { name: string, path: string, deprecated: boolean, members: Doc[] } */,
  type /*: "class" | "namespace" */,
) {
  this.type = type;
  this.name = doc.name;
  this.path = doc.path;
  this.deprecated = doc.deprecated;

  const classes = this.classes = [];
  const properties = this.members = [];
  const methods = this.methods = [];
  const events = this.events = [];
  const interfaces = this.interfaces = [];
  const enums = this.enums = [];
  const typedefs = this.typedefs = [];
  const tutorials = this.tutorials = [];

  // Loop through all the members and push them into the appropriate category.
  doc.members.forEach((child) => {
    if (child.access === "private" || child.undocumented) {
      return;
    }

    switch (child.type) {
    case "ClassDoc":
      classes.push(child);
      break;
    case "NSDoc":
      break;
    case "PropertyDoc":
      properties.push(child);
      break;
    case "MethodDoc":
    case "FunctionDoc":
      if (child.name !== "constructor") {
        methods.push(child);
      }
      break;
    case "EventDoc":
      events.push(child);
      break;
    case "InterfaceDoc":
      interfaces.push(child);
      break;
    case "EnumDoc":
      enums.push(child);
      break;
    case "TypedefDoc":
      typedefs.push(child);
      break;
    case "TutorialDoc":
      tutorials.push(child);
      break;
    default:
      console.log("Unknown doc-type " + child.type);
    }
  });
}

// Creates a list of "navigable" entries that are fed into navigation.tmpl to generate the
// main navigation bar.
function buildNav(members) /*: Navigable[] */ {
  const nav = [];

  /*
  if (members.modules.length) {
      _.each(members.modules, function (v) {
          nav.push({
              type: 'module',
              longname: v.longname,
              deprecated: v.deprecated,
              name: v.name,
              members: find({
                  kind: 'member',
                  memberof: v.longname
              }),
              methods: find({
                  kind: 'function',
                  memberof: v.longname
              }),
              typedefs: find({
                  kind: 'typedef',
                  memberof: v.longname
              }),
              interfaces: find({
                  kind: 'interface',
                  memberof: v.longname
              }),
              events: find({
                  kind: 'event',
                  memberof: v.longname
              }),
              classes: find({
                  kind: 'class',
                  memberof: v.longname
              })
          });
      });
  }
  */

  if (members.namespaces.length) {
    _.each(members.namespaces, function(nsDoc) {
      nav.push(new Navigable(nsDoc, "namespace"));
    });
  }

  if (members.globals.length) {
    nav.push(new Navigable({
      type: "NSDoc",
      name: "globals",
      path: "globals",
      members: members.globals,
    }, "namespace"));
  }

  if (members.classes.length) {
    _.each(members.classes, (classDoc) => {
      nav.push(new Navigable(classDoc, "class"));
    });
  }

  if (members.tutorials.length) {
    _.each(members.tutorials, function(v) {
      nav.push(new Navigable(tutorialDoc, "tutorial"));
    });
  }

  return nav;
}

function sourceToDestination(parentDir, sourcePath, destDir) {
  const relativeSource = path.relative(parentDir, sourcePath);

  return path.resolve(path.join(destDir, relativeSource));
}

function initLogger() {
  const defaultLevel = "INFO";

  publishLog = new Log().init(
    {
      TemplateGenerator: defaultLevel,
      ContentBar: defaultLevel,
      Signature: defaultLevel,
    },
    (level, tag, msg, params) => {
      tag = `[${tag}]:`;
      switch (level) {
      case LogLevel.ERROR:
        console.error(tag, msg, ...params);
        break;
      case LogLevel.WARN:
        console.warn(tag, msg, ...params);
        break;
      case LogLevel.INFO:
        console.info(tag, msg, ...params);
        break;
      default:
        console.log(tag, msg, ...params);
        break;
      }
    });
}

exports.publish = (options) => {
  const t0 = performance.now();
  initLogger();

  const docTree = options.doctree;

  docDatabase = options.docDatabase;
  const opts = options.opts;
  const manifest = options.manifest;
  const tutorials = options.tutorials;
  const userConfig = global.Webdoc.userConfig;
  env = options.config;

  global.env = env;
  global.env.conf = options.config;

  outdir = path.normalize(env.opts.destination);

  let conf;
  let cwd;
  let fromDir;
  let outputSourceFiles;
  let packageInfo;
  const sourceFilePaths = [];
  let sourceFiles = {};
  let staticFileFilter;
  let staticFilePaths;
  let staticFiles;
  let staticFileScanner;

  data = docDatabase;

  conf = env.conf.templates || {};
  conf.default = conf.default || {};

  const templatePath = __dirname;

  view = new TemplateRenderer(path.join(templatePath, "tmpl"), docDatabase, docTree);
  view.installPlugin("relations", RelationsPlugin);
  view.installPlugin("linker", linker);
  view.plugins.relations.buildRelations();

  view.linkto = view.linkTo;

  pipeline = new TemplatePipeline(view);
  pipeline.pipe(new TemplateTagsResolver());

  // Reserve special files
  const indexUrl = linker.createURI("index");
  const globalUrl = linker.createURI("global");

  // set up templating
  view.layout = conf.default.layoutFile ?
    path.resolve(conf.default.layoutFile) :
    "layout.tmpl";

  // set up tutorials for helper
  // helper.setTutorials(tutorials);

  // data = helper.prune(data);
  data.sort("path, version, since");
  // helper.addEventListeners(data);

  const idToDoc = new Map();

  traverse(docTree, (doc) => {
    if (doc.type === "RootDoc") {
      doc.packages.forEach((pkg) => {
        idToDoc.set(pkg.id, pkg);
      });
    }
    idToDoc.set(doc.id, doc);
  });

  data().each((doclet) => {
    let sourcePath;

    doclet.attribs = "";

    if (doclet.see) {
      doclet.see.forEach((seeItem, i) => {
        doclet.see[i] = linker.linkTo(seeItem);
      });
    }

    // build a list of source files
    if (doclet.loc) {
      sourcePath = doclet.loc.fileName;
      sourceFiles[sourcePath] = {
        resolved: sourcePath,
        shortened: null,
      };
      if (!sourceFilePaths.includes(sourcePath)) {
        sourceFilePaths.push(sourcePath);
      }
    }
  });

  // update outdir if necessary, then create outdir
  packageInfo = ( find({kind: "package"}) || [] )[0];
  if (packageInfo && packageInfo.name) {
    outdir = path.join( outdir, packageInfo.name, (packageInfo.version || "") );
  }
  mkdirpSync(outdir);

  // copy the template's static files to outdir
  fromDir = path.join(templatePath, "static");
  staticFiles = lsSync(fromDir);

  staticFiles.forEach((fileName) => {
    const toPath = sourceToDestination(fromDir, fileName, outdir);

    mkdirpSync(path.dirname(toPath));
    fs.copyFileSync(fileName, toPath);
  });

  // copy the fonts used by the template to outdir
  staticFiles = lsSync(path.join(require.resolve("open-sans-fonts"), "..", "open-sans"));

  staticFiles.forEach((fileName) => {
    const toPath = path.join(outdir, "fonts", path.basename(fileName));

    if (FONT_NAMES.includes(path.parse(fileName).name)) {
      mkdirpSync(path.dirname(toPath));
      fs.copyFileSync(fileName, toPath);
    }
  });

  // copy the prettify script to outdir
  PRETTIFIER_SCRIPT_FILES.forEach((fileName) => {
    const toPath = path.join(outdir, "scripts", path.basename(fileName));

    fs.copyFileSync(
      path.join(require.resolve("code-prettify"), "..", fileName),
      toPath,
    );
  });

  // copy the prettify CSS to outdir
  PRETTIFIER_CSS_FILES.forEach((fileName) => {
    const toPath = path.join(outdir, "styles", path.basename(fileName));

    fs.copyFileSync(
      require.resolve("color-themes-for-google-code-prettify/dist/themes/" + fileName),
      toPath,
    );
  });

  // copy user-specified static files to outdir
  /*if (conf.default.staticFiles) {
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

      filePath = path.resolve(cwd, filePath);
      extraStaticFiles = staticFileScanner.scan([filePath], 10, staticFileFilter);

      extraStaticFiles.forEach((fileName) => {
        const toPath = sourceToDestination(fromDir, fileName, outdir);

        mkdirpSync(path.dirname(toPath));
        fs.copyFileSync(fileName, toPath);
      });
    });
  }*/

  if (sourceFilePaths.length) {
    sourceFiles = shortenPaths( sourceFiles, commonPathPrefix(sourceFilePaths) );
  }

  // Create a hyperlink for each documented symbol.
  data().each((doclet) => {
    let docletPath;
    const uri = linker.getURI(doclet);

    if (manifest && doclet.id) {
      if (!manifest.registry[doclet.id]) {
        manifest.registry[doclet.id] = {};
      }

      manifest.registry[doclet.id].uri = uri;
    }

    // Make the query-cache hot for all document paths
    // linker.linkTo(doclet.path);

    // add a shortened version of the full path
    if (doclet.meta) {
      docletPath = getPathFromDoclet(doclet);
      docletPath = sourceFiles[docletPath].shortened;
      if (docletPath) {
        doclet.meta.shortpath = docletPath;
      }
    }
  });

  data().each((doc) => {
    // Add signature information to the doc
    if (needsSignature(doc)) {
      SignatureBuilder.appendParameters(doc);
      SignatureBuilder.appendReturns(doc);
      addAttribs(doc);
    }
  });

  // Link doc ancestors & finish up signatures! (after URL generation)
  data().each((doc) => {
    doc.ancestors = linker.linksToAncestors(doc);

    if (doc.type === "PropertyDoc" || doc.type === "EnumDoc") {
      SignatureBuilder.appendType(doc);
      addAttribs(doc);
    }
  });

  const members = helper.getMembers(docTree);
  members.tutorials = tutorials;
  tutorials.forEach((t) => generateTutorialLinks(t));

  // output pretty-printed source files by default
  outputSourceFiles = userConfig.template.outputSourceFiles;
  // once for all
  view.nav = buildNav(members);
  // attachModuleSymbols( find({longname: {left: "module:"}}), members.modules );

  // generate the pretty-printed source files first so other pages can link to them
  if (outputSourceFiles) {
    generateSourceFiles(sourceFiles, opts.encoding);
  }

  if (members.globals.length) {
    generate("Global", [{kind: "globalobj"}], globalUrl);
  }

  generateHomePage(indexUrl, docTree);

  for (const [id, docRecord] of linker.documentRegistry) {
    let doc;

    try {
      doc = idToDoc.get(id);
    } catch (e) {
      console.error(id + " corrupted into idToDoc map, how?");
      continue;
    }

    if (doc && doc.access !== "private" && !doc.ignore) {
      const docUrl = docRecord.uri;

      if (isClass(doc)) {
        generate(`Class: ${doc.name}`, [doc], docUrl);
      } else if (isInterface(doc)) {
        generate(`Interface: ${doc.name}`, [doc], docUrl);
      } else if (isNamespace(doc)) {
        generate(`Namespace: ${doc.name}`, [doc], docUrl);
      } else if (isMixin(doc)) {
        generate(`Mixin: ${doc.name}`, [doc], docUrl);
      } else if (isModule(doc)) {
        generate(`Module: ${doc.name}`, [doc], docUrl);
      } else if (isExternal(doc)) {
        generate(`External: ${doc.name}`, [doc], docUrl);
      }
    }
  }

  console.log(`@pixi/webdoc-template took ${Math.ceil(performance.now() - t0)}ms to run!`);

  /*

  // TODO: move the tutorial functions to templateHelper.js
  function generateTutorial(title, tutorial, filename) {
    const tutorialData = {
      title: title,
      header: tutorial.title,
      content: tutorial.parse(),
      children: tutorial.children,
    };
    const tutorialPath = path.join(outdir, filename);
    let html = pipeline.render("tutorial.tmpl", tutorialData);

    // yes, you can use {@link} in tutorials too!
    html = helper.resolveLinks(html); // turn {@link foo} into <a href="foodoc.html">foo</a>

    fs.writeFileSync(tutorialPath, html, "utf8");
  }

  // tutorials can have only one parent so there is no risk for loops
  function saveChildren({children}) {
    children.forEach((child) => {
      generateTutorial(`Tutorial: ${child.title}`, child, helper.tutorialToUrl(child.name));
      saveChildren(child);
    });
  }

  saveChildren(tutorials);*/
};

// Generate the HTML file with the documentation of all docs
function generate(title, docs, filename) {
  const docData = {
    env: env,
    title: title,
    docs: docs,
    fileName: filename,
  };
  const outpath = path.join(outdir, filename);
  const html = pipeline.render("container.tmpl", docData);

  // We don't except to write on this file again (or do we?)
  fse.outputFile(outpath, html, "utf8", (error) => {
    if (error) {
      console.error("Couldn't save " + outpath + " because " + error);
    }
  });
}

// Generate the home page, this loads the top-level members, packages, and README
async function generateHomePage(pagePath /*: string */, rootDoc /*: RootDoc */) /*: void */ {
  const userConfig = Webdoc.userConfig;

  // index page displays information from package.json and lists files
  const files = docDatabase({kind: "file"}).get();
  const packages = docDatabase({type: "PackageDoc"}).get();

  const arr = rootDoc.members.filter((doc) =>
    doc.type === "FunctionDoc" ||
      doc.type === "EnumDoc" ||
      doc.type === "MethodDoc" ||
      doc.type === "PropertyDoc" ||
      doc.type === "TypedefDoc");

  const readme = userConfig.template.readme;
  let readmeContent = "";

  if (readme) {
    const readmePath = path.join(process.cwd(), readme);

    readmeContent = await fsp.readFile(readmePath, "utf8");

    const markdownRenderer = require("markdown-it")({
      breaks: false,
      html: true,
    })
      .use(require("markdown-it-highlightjs"));

    readmeContent = markdownRenderer.render(readmeContent);
  }

  generate("Home",
    packages.concat(
      [{
        type: "mainPage",
        readme: readmeContent,
        path: userConfig.template.mainPage.title,
        children: arr,
        members: arr,
      }],
    ).concat(files), pagePath);
}

function generateTutorialLinks(tutorial /*: TutorialDoc */) {
  if (!tutorial) {
    return;
  }

  linker.getURI(tutorial);

  tutorial.members.forEach((child) => {
    generateTutorialLinks(child);
  });
}

/*::
type Tutorial = {
  title: string,
  content: string,
  children: Tutorial[]
}
*/

async function generateTutorial(title /*: string */, tutorial /*: string */, filename /*: string */) {
  const tutorialData = {
    title: title,
    header: tutorial.title,
    content: tutorial.parse(),
    children: tutorial.children,
  };

  const tutorialPath = path.join(outdir, filename);
  const html = pipeline.render("tutorial.tmpl", tutorialData);

  fs.writeFileSync(tutorialPath, html, "utf8");
}

function generateSourceFiles(sourceFiles, encoding = "utf8") {
  Object.keys(sourceFiles).forEach((file) => {
    let source;
    // links are keyed to the shortened path in each doclet's `meta.shortpath` property
    const sourceOutfile = linker.createURI(sourceFiles[file].shortened);

    // Hack query cache point source file to URI
    linker.queryCache.set(sourceFiles[file].resolved, sourceOutfile);

    try {
      source = {
        type: "sourceFile",
        code: helper.toHtmlSafeString( fs.readFileSync(sourceFiles[file].resolved, encoding) ),
      };
    } catch (e) {
      publishLog.error("SourceFile", `Error while generating source file ${file}: ${e.message}`);
    }

    generate(`Source: ${sourceFiles[file].shortened}`, [source], sourceOutfile,
      false);
  });
}
