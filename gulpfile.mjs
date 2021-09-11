/* eslint-disable func-style, no-restricted-syntax */

'use strict';

import del from 'del';
import escapeStringRegexp from 'escape-string-regexp';
import operators from 'glsl-tokenizer/lib/operators.js';
import gulp from 'gulp';
import advzip from 'gulp-advzip';
import htmlmin from 'gulp-html-minifier-terser';
import replace from 'gulp-replace';
import size from 'gulp-size';
import terser from 'gulp-terser';
import zip from 'gulp-zip';
import { inlineSource } from 'inline-source';
import { Packer } from 'roadroller';
import { rollup } from 'rollup';
import through2 from 'through2';

const SPACES_AROUND_OPERATORS_REGEX = new RegExp(
  `\\s*(${operators.map(escapeStringRegexp).join('|')})\\s*`,
  'g',
);

const clean = () => del(['build', 'dist']);
export { clean };

// https://github.com/mrdoob/three.js/blob/dev/utils/build/rollup.config.js
function glConstants() {
  const constants = {
    TRIANGLES: 4,
    DEPTH_BUFFER_BIT: 256,
    LEQUAL: 515,
    CW: 2304,
    CCW: 2305,
    CULL_FACE: 2884,
    DEPTH_TEST: 2929,
    TEXTURE_2D: 3553,
    UNSIGNED_BYTE: 5121,
    FLOAT: 5126,
    RGBA: 6408,
    NEAREST: 9728,
    TEXTURE_MAG_FILTER: 10240,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    COLOR_BUFFER_BIT: 16384,
    RGBA8: 32856,
    CLAMP_TO_EDGE: 33071,
    DEPTH_COMPONENT16: 33189,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    ACTIVE_UNIFORMS: 35718,
    ACTIVE_ATTRIBUTES: 35721,
    COLOR_ATTACHMENT0: 36064,
    DEPTH_ATTACHMENT: 36096,
    FRAMEBUFFER: 36160,
    RENDERBUFFER: 36161,
  };

  return {
    transform(code) {
      return code.replace(/gl\.([A-Z0-9_]+)/g, (match, name) => {
        if (constants[name]) return constants[name];
        console.log('* Unhandled GL Constant:', name);
        return match;
      });
    },
  };
}

function glsl() {
  function minify(code) {
    return (
      code
        // Remove //
        .replace(/\s*\/\/.*\n/g, '')
        // Remove /* */
        .replace(/\s*\/\*[\s\S]*?\*\//g, '')
        // # \n+ to \n
        .replace(/\n{2,}/g, '\n')
        // Remove tabs and consecutive spaces with a single space
        .replace(/\s{2,}|\t/g, ' ')
        .split('\n')
        .map((line, index, array) => {
          line = line
            .trim()
            // Remove spaces around operators.
            .replace(SPACES_AROUND_OPERATORS_REGEX, '$1');

          // Append newlines after preprocessor directives.
          if (line[0] === '#') {
            line += '\n';

            // Append newlines before the start of preprocessor directive blocks.
            if (index > 0) {
              if (array[index - 1][0] !== '#') {
                line = '\n' + line;
              }
            }
          }

          return line;
        })
        .join('')
    );
  }

  return {
    transform(code, id) {
      if (!id.endsWith('.glsl.js')) {
        return;
      }

      const startIndex = code.indexOf('`');
      const prefix = code.slice(0, startIndex);
      const endIndex = code.lastIndexOf('`');
      const glslString = code.slice(startIndex + 1, endIndex - 1).trim();

      return `${prefix}\`${minify(glslString)}\``;
    },
  };
}

function glslMangle() {
  return {
    transform(code, id) {
      if (!id.endsWith('.glsl.js')) {
        return;
      }

      // From terser output for dist/min/bundle.js.
      // Replace in-order, ignoring frequency.
      const chars = 'e,i,r,a,o,t,n,s,c,v,m,l,x,d,y,h'.split(',');

      const mangleableTokens = (() => {
        switch (true) {
          case id.endsWith('depth_frag.glsl.js'):
            return ['packDepthToRGBA'];
          case id.endsWith('phong_frag.glsl.js'):
            return [
              'saturate',
              'DirectionalLight',
              'diffuseColor',
              'normal',
              'viewDir',
              'shadowCoord',
              'irradiance',
              'halfDir',
              'dotVH',
              'fresnel',
            ];
          case id.endsWith('phong_vert.glsl.js'):
            return ['mvPosition'];
          default:
            return [];
        }
      })();

      mangleableTokens.map(
        (token, index) =>
          (code = code.replace(
            new RegExp(`\\b${token}\\b`, 'g'),
            chars[index],
          )),
      );

      return code;
    },
  };
}

export function bundle() {
  return rollup({
    input: 'src/index.js',
    plugins: [
      glConstants(),
      glsl(),
      glslMangle(),
      {
        transform(code) {
          [].map(
            ([a, b]) => (code = code.replace(new RegExp(`\\b${a}\\b`, 'g'), b)),
          );
          return code;
        },
      },
    ],
  })
    .then(bundle =>
      bundle.write({
        file: 'dist/src/bundle.js',
        format: 'es',
      }),
    )
    .catch(error => console.error(error));
}

export function minify() {
  return gulp
    .src('dist/src/bundle.js')
    .pipe(
      terser({
        compress: {
          drop_console: true,
          ecma: 2020,
          module: true,
          passes: 2,
          unsafe_arrows: true,
        },
        mangle: {
          module: true,
        },
      }),
    )
    .pipe(gulp.dest('dist/min'));
}

export function roadroller() {
  return gulp
    .src('dist/min/bundle.js')
    .pipe(
      through2.obj(async (file, encoding, callback) => {
        const packer = new Packer(
          [
            {
              data: file.contents.toString(),
              type: 'js',
              action: 'eval',
            },
          ],
          { optimize: 2 },
        );
        await packer.optimize();
        const { firstLine, secondLine } = packer.makeDecoder();
        file.contents = Buffer.from(firstLine + '\n' + secondLine);
        callback(null, file);
      }),
    )
    .pipe(gulp.dest('dist/min'));
}

export function html() {
  return gulp
    .src('index.html')
    .pipe(
      htmlmin({
        collapseWhitespace: true,
        minifyCSS: true,
        removeAttributeQuotes: true,
        removeComments: true,
        removeOptionalTags: true,
      }),
    )
    .pipe(replace('./src/index.js', './bundle.js'))
    .pipe(
      through2.obj(async (file, encoding, callback) => {
        const html = await inlineSource(file.contents.toString(), {
          attribute: false,
          compress: false,
          rootpath: 'dist/min',
        });
        file.contents = Buffer.from(html);
        callback(null, file);
      }),
    )
    .pipe(gulp.dest('dist/min'));
}

export function compress() {
  return gulp
    .src('dist/min/index.html')
    .pipe(zip('build.zip'))
    .pipe(size())
    .pipe(size({ pretty: false }))
    .pipe(gulp.dest('dist'));
}

export function compressAdvzip() {
  return gulp
    .src('dist/build.zip')
    .pipe(
      advzip({
        optimizationLevel: 4,
        iterations: 100,
      }),
    )
    .pipe(gulp.dest('dist'));
}

const js = gulp.series(bundle, minify);
const build = gulp.series(clean, js, html);
const dist = gulp.series(build, compress);
const distAdvzip = gulp.series(dist, compressAdvzip);
const distRoadrollerAdvzip = gulp.series(
  clean,
  js,
  roadroller,
  html,
  compress,
  compressAdvzip,
);

export { js, build, dist, distAdvzip, distRoadrollerAdvzip };
