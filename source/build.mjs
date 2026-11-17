// Bundles src/ into the single self-contained ../index.html and reports its size.
//   npm run build            minified: JS minified by esbuild, WGSL stripped and its names shortened
//   npm run build:readable   unminified, for debugging
//   npm run build:dev        ../dev.html: unminified, plus the walk-through and benchmark in src/dev.js
// WGSL lives in template literals marked /* wgsl */. Every name declared in WGSL (functions, variables,
// structs and their fields, parameters) gets one short name shared by all shaders, so pieces of WGSL that are
// joined in JS still agree. Entry points (@vertex, @fragment, @compute) and override constants keep their
// names, because JS refers to them.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, transform } from 'esbuild';

const sourceFolder = path.dirname(fileURLToPath(import.meta.url));
const isDevBuild = process.argv.includes('--dev');
const isReadable = isDevBuild || process.argv.includes('--readable');
const outputName = isDevBuild ? 'dev.html' : 'index.html';
const sizeLimitBytes = 150 * 1024;

const wgslLiteralPattern = /\/\*\s*wgsl\s*\*\/\s*`([^`]*)`/g;
const interpolationPattern = /(\$\{[^}]*\})/;

// ---------------------------------------------------------------- WGSL minifier
const wgslReservedWords = new Set(`
  fn let var const override struct alias return if else for while loop break continue continuing switch case default
  discard true false enable requires diagnostic bitcast array atomic bool f16 f32 i32 u32 mat2x2 mat2x3 mat2x4 mat3x2
  mat3x3 mat3x4 mat4x2 mat4x3 mat4x4 mat2x2f mat3x3f mat4x4f ptr sampler sampler_comparison texture_2d texture_3d
  texture_depth_2d texture_cube texture_storage_2d texture_multisampled_2d texture_depth_multisampled_2d vec2 vec3 vec4
  vec2f vec3f vec4f vec2i vec3i vec4i vec2u vec3u vec4u vec2h vec3h vec4h uniform storage read write read_write function
  private workgroup position vertex_index instance_index front_facing frag_depth sample_index sample_mask
  local_invocation_id local_invocation_index global_invocation_id workgroup_id num_workgroups location builtin group
  binding vertex fragment compute workgroup_size interpolate flat linear perspective center centroid sample invariant
  id align size do as
  abs acos all any asin atan atan2 ceil clamp cos cosh cross degrees determinant distance dot exp exp2 floor fma fract
  inverseSqrt length log log2 max min mix normalize pow radians reflect refract round select sign sin sinh smoothstep
  sqrt step tan tanh transpose trunc dpdx dpdy fwidth textureSample textureSampleLevel textureSampleCompare
  textureSampleCompareLevel textureLoad textureDimensions arrayLength`.trim().split(/\s+/)); // WGSL words and builtins

function stripWgsl(code) {
  return code
    .replace(/\/\*[^]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\s+/g, ' ')
    .replace(/ ?([{}()\[\];,:=+\-*\/<>&|!%@.^~?]) ?/g, '$1');
  // no trim: a space next to a \${...} interpolation may separate two words ("case \${id}u")
}

function staticParts(literal) {
  return literal.split(interpolationPattern).filter((part, index) => index % 2 === 0);
}

// Collects every renamable declared name in all WGSL, and every token used anywhere (to avoid clashes).
function collectWgslNames(literals) {
  const declared = new Set(), fields = new Set(), kept = new Set(), usedTokens = new Set(), counts = new Map();
  for (const literal of literals) {
    for (const part of staticParts(literal)) {
      const code = stripWgsl(part);
      for (const token of code.match(/[A-Za-z_]\w*/g) || []) {
        usedTokens.add(token);
        counts.set(token, (counts.get(token) || 0) + 1);
      }
      for (const [, name] of code.matchAll(/@(?:vertex|fragment|compute) ?(?:@\w+(?:\([^)]*\))? ?)*fn ?(\w+)/g)) kept.add(name);
      for (const [, name] of code.matchAll(/\boverride (\w+)/g)) kept.add(name);
      for (const [, name] of code.matchAll(/\bfn (\w+)/g)) declared.add(name);
      for (const [, name] of code.matchAll(/\b(?:let|var|const)(?:<[^>]*>)? ?(\w+)/g)) declared.add(name);
      for (const [, name] of code.matchAll(/\b(?:struct|alias) (\w+)/g)) declared.add(name);
      // function parameters: names followed by a colon inside fn(...)
      for (const [, parameters] of code.matchAll(/\bfn \w+\(((?:[^()]|\([^()]*\))*)\)/g)) {
        for (const [, name] of parameters.matchAll(/(?:^|,|\))(\w+):/g)) declared.add(name);
      }
      for (const [, body] of code.matchAll(/\bstruct \w+\{([^}]*)\}/g)) {
        for (const [, name] of body.matchAll(/(?:^|,|\))(\w+):/g)) fields.add(name);
      }
    }
  }
  const isRenamable = (name) => name.length > 2 && !wgslReservedWords.has(name) && !kept.has(name) && !/^[xyzw]+$|^[rgba]+$/.test(name);
  return {
    names: [...declared, ...fields].filter(isRenamable),
    fields: new Set([...fields].filter(isRenamable)),
    usedTokens, counts,
  };
}

function* shortNames() {
  const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const first of letters) yield first;
  for (const first of letters) for (const second of letters + '0123456789_') yield first + second;
  for (const first of letters) for (const second of letters) for (const third of letters) yield first + second + third;
}

// The most used names get the shortest replacements.
function createWgslRenameMap(literals) {
  const { names, fields, usedTokens, counts } = collectWgslNames(literals);
  const uniqueNames = [...new Set(names)].sort((a, b) => counts.get(b) - counts.get(a));
  const renames = new Map(), generator = shortNames();
  for (const name of uniqueNames) {
    let candidate;
    do candidate = generator.next().value;
    while (usedTokens.has(candidate) || wgslReservedWords.has(candidate) || /^_/.test(candidate));
    renames.set(name, candidate);
  }
  return { renames, fields };
}

function minifyWgslLiteral(literal, { renames, fields }) {
  return literal.split(interpolationPattern).map((part, index) => {
    if (index % 2 === 1) return part; // a JS interpolation: leave it alone
    const stripped = stripWgsl(part);
    // builtin and interpolation attribute arguments are WGSL vocabulary, never renamed
    return stripped.replace(/(@(?:builtin|interpolate)\([^)]*\))|(\.?)([A-Za-z_]\w*)/g, (match, attribute, dot, name) => {
      if (attribute) return attribute;
      const renamed = renames.get(name);
      if (!renamed || (dot && !fields.has(name))) return match;
      return dot + renamed;
    });
  }).join('');
}

// ---------------------------------------------------------------- bundling
function listJsFiles(folder) {
  return readdirSync(folder).flatMap((name) => {
    const full = path.join(folder, name);
    return statSync(full).isDirectory() ? listJsFiles(full) : name.endsWith('.js') ? [full] : [];
  });
}

const sourceFiles = listJsFiles(path.join(sourceFolder, 'src'));
const allWgslLiterals = sourceFiles.flatMap((file) => [...readFileSync(file, 'utf8').matchAll(wgslLiteralPattern)].map((match) => match[1]));
for (const literal of allWgslLiterals) {
  if (/\$\{[^}]*\{/.test(literal)) throw new Error('WGSL literal with braces inside ${...}: build the value in a constant first\n' + literal.slice(0, 200));
}
const wgslRenameMap = createWgslRenameMap(allWgslLiterals);

const wgslMinifierPlugin = {
  name: 'wgsl-minifier',
  setup(builder) {
    builder.onLoad({ filter: /\.js$/ }, (args) => {
      const source = readFileSync(args.path, 'utf8');
      if (isReadable) return { contents: source, loader: 'js' };
      const contents = source.replace(wgslLiteralPattern, (_, literal) => '`' + minifyWgslLiteral(literal, wgslRenameMap) + '`');
      return { contents, loader: 'js' };
    });
  },
};

const result = await build({
  entryPoints: [path.join(sourceFolder, 'src', 'main.js')],
  bundle: true, write: false, format: 'iife', target: 'es2022', metafile: true,
  minify: !isReadable, legalComments: 'none',
  define: { DEV_BUILD: String(isDevBuild) },
  plugins: [wgslMinifierPlugin],
});
const script = result.outputFiles[0].text.trim();

let page = readFileSync(path.join(sourceFolder, 'template.html'), 'utf8');
if (!isReadable) {
  const style = page.match(/<style>([^]*?)<\/style>/)[1];
  const minifiedStyle = (await transform(style, { loader: 'css', minify: true })).code.trim();
  page = page.replace(style, () => minifiedStyle).replace(/>\s+</g, '><');
}
page = page.replace(/<script>\s*\/\*SCRIPT\*\/\s*<\/script>/, () => `<script>${script.replace(/<\/script/gi, '<\\/script')}</script>`);
writeFileSync(path.join(sourceFolder, '..', outputName), page);

// ---------------------------------------------------------------- size report
const kilobytes = (bytes) => (bytes / 1024).toFixed(1) + ' KB';
const gzippedBytes = gzipSync(Buffer.from(page), { level: 9 }).length;
console.log(`${outputName}: ${kilobytes(page.length)}${isReadable ? ' (readable)' : ' minified'}, ${kilobytes(gzippedBytes)} gzipped`);
if (!isReadable) {
  const [outputInfo] = Object.values(result.metafile.outputs);
  const contributors = Object.entries(outputInfo.inputs)
    .map(([file, info]) => [file.replace(/^.*?src\//, ''), info.bytesInOutput])
    .sort((a, b) => b[1] - a[1]);
  console.log('Biggest contributors (minified bytes):');
  for (const [file, bytes] of contributors.slice(0, 12)) console.log(`  ${String(bytes).padStart(7)}  ${file}`);
  console.log(`  ${String(page.length - script.length).padStart(7)}  template.html (page shell and CSS)`);
  if (page.length > sizeLimitBytes) {
    console.error(`Over the ${kilobytes(sizeLimitBytes)} size budget!`);
    process.exitCode = 1;
  }
}
