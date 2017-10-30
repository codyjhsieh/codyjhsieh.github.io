var gulp = require('gulp'),
	sass = require('gulp-sass')
	pug = require('gulp-pug');
	watch = require('gulp-watch');
	browsersync = require('browser-sync');

var syncOpt = {
	    server: {
	      baseDir: './public',
	      index: 'index.html'
	    }
  	};

// Default Task
gulp.task('default', ['pug', 'sass', 'watch']);

// run this task by typing in gulp pug in CLI
gulp.task('pug',function() {
 return gulp.src('source/views/*.pug')
 .pipe(pug({
    doctype: 'html',
    pretty: true
 }))
 .pipe(gulp.dest('./public/'));
});

 // Compile Our Sass
gulp.task('sass', function() {
    return gulp.src('source/sass/*.scss')
        .pipe(sass())
        .pipe(gulp.dest('public/css'))
    	.pipe(browsersync.reload({ stream: true }));
});

gulp.task('browsersync', function () {
  browsersync(syncOpt);
});

// Watches for file changes
gulp.task('watch', ['browsersync'], function() {
    gulp.watch('source/views/*.pug', ['pug', browsersync.reload]);
    gulp.watch('source/sass/*.scss', ['sass', browsersync.reload]);
});
