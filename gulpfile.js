var gulp = require('gulp'),
	sass = require('gulp-sass')
	pug = require('gulp-pug');
	watch = require('gulp-watch');
	browsersync = require('browser-sync');
    imagemin = require('gulp-imagemin');
    imageResize = require('gulp-image-resize');
var syncOpt = {
	    server: {
	      baseDir: './public',
	      index: 'index.html',
          projects: 'projects.html',
          blog: 'blog.html',
          contact: 'contact.html'
	    }
  	};

// Default Task
gulp.task('default', ['copy', 'pug', 'sass', 'watch', 'resize', 'imagemin']);

// Copy basic things like fonts
gulp.task('copy', function () {
    gulp.src('./source/js/*.js')
        .pipe(gulp.dest('./public/js/'));
});

// run this task by typing in gulp pug in CLI
gulp.task('pug',function() {
 return gulp.src('./source/views/*.pug')
 .pipe(pug({
    doctype: 'html',
    pretty: true
 }))
 .pipe(gulp.dest('./public/'));
});

 // Compile Our Sass
gulp.task('sass', function() {
    return gulp.src('./source/sass/*.scss')
        .pipe(sass())
        .pipe(gulp.dest('./public/css'))
    	.pipe(browsersync.reload({ stream: true }));
});

gulp.task('browsersync', function () {
  browsersync(syncOpt);
});

gulp.task('resize', function () {
  gulp.src('./source/assets/images/*.*')
    .pipe(imageResize({
      percentage: 25
    }))
    .pipe(gulp.dest('./public/images/'));
});

gulp.task('imagemin', () =>
    gulp.src('./public/images/*.*')
        .pipe(imagemin())
        .pipe(gulp.dest('./public/images/'))
);

// Watches for file changes
gulp.task('watch', ['browsersync'], function() {
    gulp.watch('./gulpfile.js', ['default', browsersync.reload]);
    gulp.watch('./source/js/*.js', ['copy', browsersync.reload]);
    gulp.watch('./source/views/*.pug', ['pug', browsersync.reload]);
    gulp.watch('./source/sass/*.scss', ['sass', browsersync.reload]);
    gulp.watch('./source/assets/images/*.*', ['resize', browsersync.reload]);
    gulp.watch('./public/images/*.*', ['imagemin', browsersync.reload]);
});
