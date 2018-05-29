var gulp = require('gulp'),
	sass = require('gulp-sass')
	pug = require('gulp-pug');
	watch = require('gulp-watch');
	browsersync = require('browser-sync');
  imagemin = require('gulp-imagemin');
  imageResize = require('gulp-image-resize');
  autoprefixer = require('gulp-autoprefixer');

var syncOpt = {
	    server: {
	      baseDir: '.',
	      index: 'index.html',
          projects: 'projects.html',
          blog: 'blog.html',
          contact: 'contact.html'
	    }
  	};

// Default Task
gulp.task('default', ['copy', 'pug', 'sass', 'watch', 'resize', 'imagemin', 'autoprefix']);

// Copy basic things like fonts
gulp.task('copy', function () {
    gulp.src('./source/js/*.js')
        .pipe(gulp.dest('./js/'));
    gulp.src('./source/assets/images/*.svg')
        .pipe(gulp.dest('./assets/images/')); 
});

// run this task by typing in gulp pug in CLI
gulp.task('pug',function() {
 return gulp.src('./source/views/*.pug')
 .pipe(pug({
    doctype: 'html',
    pretty: true
 }))
 .pipe(gulp.dest('./'));
});

 // Compile Our Sass
gulp.task('sass', function() {
    return gulp.src('./source/sass/*.scss')
        .pipe(sass())
        .pipe(gulp.dest('./css'))
    	.pipe(browsersync.reload({ stream: true }));
});

gulp.task('browsersync', function () {
  browsersync(syncOpt);
});

gulp.task('resize', function () {
  gulp.src('./source/assets/images/*.jpg')
    .pipe(imageResize({
      percentage: 40
    }))
    .pipe(gulp.dest('./assets/images/'));
});

gulp.task('imagemin', () =>
    gulp.src('./assets/images/*.jpg')
        .pipe(imagemin())
        .pipe(gulp.dest('./assets/images/'))
);
 
gulp.task('autoprefix', () =>
    gulp.src('css/style.css')
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
            cascade: false
        }))
        .pipe(gulp.dest('css/'))
);
// Watches for file changes
gulp.task('watch', ['browsersync'], function() {
    gulp.watch('./gulpfile.js', ['default', browsersync.reload]);
    gulp.watch('./source/js/*.js', ['copy', browsersync.reload]);
    gulp.watch('./source/views/*.pug', ['pug', browsersync.reload]);
    gulp.watch('./source/sass/*.scss', ['sass', 'autoprefix', browsersync.reload]);
    gulp.watch('./source/assets/images/*.*', ['resize', browsersync.reload]);
});
