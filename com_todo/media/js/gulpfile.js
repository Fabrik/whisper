var gulp = require('gulp'),
    browserify = require('browserify'),
    babelify = require('babelify'),
    source = require('vinyl-source-stream');

gulp.task('watch', function () {
    gulp.watch('./src/*.js', ['dist']);
});

/**
 * First runs scripts and then browserifies them and converts them from es6 to es2015 js code
 */
gulp.task('dist',  function () {

    browserify(
        {
            entries: './src/index.js',
            extensions: ['.js'],
            debug: true
        }
    )
        .transform(babelify, {presets: ['es2015', 'stage-2', 'react']})
        .bundle()
        .pipe(source('index.js'))
        .pipe(gulp.dest('./')) ;
});