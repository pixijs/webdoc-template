# @pixi/webdoc-template

This template is used to generate the standalone PixiJS API documentation and was based on [pixi-jsdoc-template](https://github.com/pixijs/pixi-jsdoc-template).

For usage, see [webdoc](https://github.com/webdoc-labs/webdoc).

## Working with docs generation

- Docs generation triggers the `publish.js` script which will generate and manipulate all the doc nodes that are then used to build out the docs HTML files - based on the templates within the `tmpl` directory. The `.tmpl` template files can be edited directly and will be reflected on rebuild.
- Static resources within the `static` directory will also be copied over into the directory where the compiled HTML files go, which include the scripts and the styles.
- To iterate on the `publish.js`, the `main.js` script and the `main.css`, please refer to the `src` directory which hold all the source files for these 3 compiled files.
  - `src/index.js` is the entry point for the compilation of `publish.js` while `src/static/index.js` is for `main.js` that gets loaded on the client.
  - `src/static/styles/index.scss` is the entry point for the compilation of `main.css` that also gets loaded alongside the client from within the HTML files.
- Once altered, run `npm run build` to kick start the compilation. `npm run watch` is also available for re-compilation on changes.
