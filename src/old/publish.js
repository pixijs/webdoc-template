const fs = require("fs");
const path = require("path");
const helper = require("./helper");
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
const {find, mkdirpSync} = require("./utils.js");

let publishLog;
let docDatabase;
let env;
let data;
let outdir;

exports.publish = (options) => {
  const t0 = performance.now();

  const docTree = options.doctree;

  docDatabase = options.docDatabase;
  env = options.config;
  global.env = env;
  global.env.conf = options.config;
  outdir = path.normalize(env.opts.destination);

  const conf = env.conf.templates || {};
  conf.default = conf.default || {};

  data = docDatabase;
  data.sort("path, version, since");

  const idToDoc = new Map();

  traverse(docTree, (doc) => {
    if (doc.type === "RootDoc") {
      doc.packages.forEach((pkg) => {
        idToDoc.set(pkg.id, pkg);
      });
    }
    idToDoc.set(doc.id, doc);
  });

  mkdirpSync(outdir);

  // TODO build nav

  generateHomePage(indexUrl, docTree);

  for (const [id, docRecord] of linker.documentRegistry) {
    const doc = idToDoc.get(id);

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
