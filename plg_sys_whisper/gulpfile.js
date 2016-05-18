var gulp = require('gulp'),
    browserify = require('browserify'),
    babelify = require('babelify'),
    source = require('vinyl-source-stream'),
    uglify = require('gulp-uglify'),
    buffer = require('vinyl-buffer');

    gulp.task('watch', function () {
        gulp.watch('./src/*.js', ['dist']);
    });

    /**
     * First runs scripts and then browserifies them and converts them from es6 to es2015 js code
     */
    gulp.task('dist', function () {
        process.env.NODE_ENV = 'production';
        browserify(
            {
                entries   : './src/app.js',
                extensions: ['.js'],
                debug     : true
            }
        )
        .transform(babelify, {presets: ['es2015', 'stage-2']})
        .bundle()
        .pipe(source('whisper.js'))
        .pipe(buffer()) // <----- convert from streaming to buffered vinyl file object
        .pipe(uglify()) // now gulp-uglify works
        .pipe(gulp.dest('./'));
});


gulp.task('default', ['dist'], function () {
});