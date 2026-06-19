/**
 * Gulp Task for Critical CSS Extraction
 * 
 * Usage: gulp critical
 */

const gulp = require('gulp');
const critical = require('critical').stream;
const htmlmin = require('gulp-htmlmin');
const rename = require('gulp-rename');

// Configuration
const config = {
  base: 'dist/',
  src: '**/*.html',
  dest: 'dist/',
  dimensions: [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1920, height: 1080 }
  ]
};

// Extract critical CSS for all HTML files
gulp.task('critical', () => {
  return gulp.src(config.src, { cwd: config.base })
    .pipe(critical({
      base: config.base,
      inline: true,
      css: ['dist/css/**/*.css'],
      dimensions: config.dimensions,
      minify: true,
      extract: true,
      ignore: {
        atrule: ['@font-face'],
        rule: [/\.no-critical/]
      },
      penthouse: {
        timeout: 30000
      }
    }))
    .on('error', err => {
      console.error('Critical CSS Error:', err.message);
    })
    .pipe(htmlmin({
      collapseWhitespace: true,
      removeComments: true
    }))
    .pipe(gulp.dest(config.dest));
});

// Watch task
gulp.task('critical:watch', () => {
  gulp.watch([config.base + config.src, 'dist/css/**/*.css'], gulp.series('critical'));
});

// Default task
gulp.task('default', gulp.series('critical'));
