'use strict';

const gulp   = require('gulp');
const batch  = require('gulp-batch');
const config = require('../../config');

gulp.task('watch:test', function () {
  return gulp.watch([config.srcFiles, config.testFiles], batch(function (events, cb) {
    return gulp.start('test');
  }));
});
