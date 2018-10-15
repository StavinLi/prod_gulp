var gulp = require('gulp');
var autoprefixer = require('gulp-autoprefixer'); // 处理css中浏览器兼容的前缀  
var babel = require("gulp-babel"); //转码
var runSequence = require('gulp-sequence'); //任务顺序'
var cssmin = require('gulp-clean-css'); //压缩css
var jsmin = require('gulp-uglify'); //压缩js
var stripDebug = require('gulp-strip-debug'); //去console.log
var htmlmin = require('gulp-htmlmin'); //压缩html
var imagemin = require('gulp-imagemin'); //压缩image
var sourcemaps = require('gulp-sourcemaps'); // 来源地图
var base64 = require('gulp-base64');
var rev = require('gulp-rev');
var debug = require('gulp-debug');
var changed = require('gulp-changed');
var plumber = require('gulp-plumber');
var revCollector = require('gulp-rev-collector');

var baseUrl = "/new",
    staticUrl = baseUrl + '/testStatic',
    programsUrl = baseUrl + '/testPrograms/web';
//定义css、js源文件路径
var cxwSrc = "dest/cxw/**/**/*",
    libsSrc = "dest/+(r|s)/libs/**/**/*",
    cssSrc = 'dest/+(r|s)/css/**/**/*.css',
    jsSrc = 'dest/+(r|s)/js/**/**/*.js',
    htmlSrc = 'dest/+(r|s)/**/*.html',
    imageSrc = 'dest/+(r|s)/images/**/*.{jpg,png,ico,gif}',
    jspSrc = programsUrl + '/+(ydc_site|ydc_project)/webapps/ROOT/WEB-INF/view/**/**/*.jsp';

gulp.task('cxw', function() {
    return gulp.src(cxwSrc)
        .pipe(changed(staticUrl))
        .pipe(debug({ title: '编译:' }))
        .pipe(gulp.dest(staticUrl + '/cxw'));
});

gulp.task('staticLibs', function() {
    return gulp.src(libsSrc)
        .pipe(changed(staticUrl))
        .pipe(debug({ title: '编译:' }))
        .pipe(rev())
        .pipe(gulp.dest(staticUrl))
        .pipe(rev.manifest())
        .pipe(gulp.dest('rev/libs'));
});
gulp.task('staticCss', function() {
    return gulp.src(cssSrc)
        .pipe(changed(staticUrl))
        .pipe(debug({ title: '编译:' }))
        .pipe(sourcemaps.init())
        .pipe(autoprefixer({
            browsers: ['last 4 versions'],
        }))
        .pipe(base64({
            extensions: ['jpg', 'png'],
            maxImageSize: 20 * 1024, // bytes 
            debug: true
        }))
        .pipe(cssmin({
            advanced: false, //类型：Boolean 默认：true [是否开启高级优化（合并选择器等）]
            compatibility: 'ie8', //保留ie7及以下兼容写法 类型：String 默认：''or'*' [启用兼容模式； 'ie7'：IE7兼容模式，'ie8'：IE8兼容模式，'*'：IE9+兼容模式]
            keepBreaks: false, //类型：Boolean 默认：false [是否保留换行]
            keepSpecialComments: '*', //保留所有特殊前缀 当你用autoprefixer生成的浏览器前缀，如果不加这个参数，有可能将会删除你的部分前缀
            debug: true,
            rebase: false
        }, function(details) {
            console.log(details.name + ': 原始-' + details.stats.originalSize + ',压缩后-' + details.stats.minifiedSize);
        }))
        .pipe(sourcemaps.write('_srcmap'))
        .pipe(rev())
        .pipe(gulp.dest(staticUrl))
        .pipe(rev.manifest())
        .pipe(gulp.dest('rev/css'));
});
/** 
 * js处理 
 */
gulp.task('staticJs', function() {
    return gulp.src(jsSrc)
        .pipe(changed(staticUrl))
        .pipe(debug({ title: '编译:' }))
        .pipe(sourcemaps.init())
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(jsmin({
            mangle: true, //类型：Boolean 默认：true 是否修改变量名
            compress: true //类型：Boolean 默认：true 是否完全压缩
        }))
        .pipe(stripDebug())
        .pipe(sourcemaps.write('_srcmap'))
        .pipe(rev())
        .pipe(gulp.dest(staticUrl))
        .pipe(rev.manifest())
        .pipe(gulp.dest('rev/js'));
});
gulp.task('staticHtml', function() {
    return gulp.src(htmlSrc)
        .pipe(changed(staticUrl))
        .pipe(debug({ title: '编译:' }))
        .pipe(htmlmin({
            removeComments: true, //清除HTML注释
            collapseWhitespace: true, //压缩HTML
            collapseBooleanAttributes: true, //省略布尔属性的值 <input checked="true"/> ==> <input />
            removeEmptyAttributes: true, //删除所有空格作属性值 <input id="" /> ==> <input />
            removeScriptTypeAttributes: true, //删除<script>的type="text/javascript"
            removeStyleLinkTypeAttributes: true, //删除<style>和<link>的type="text/css"
            minifyJS: true, //压缩页面JS
            minifyCSS: true //压缩页面CSS
        }))
        .pipe(gulp.dest(staticUrl));
});
//压缩图片
gulp.task('staicImage', function() {
    return gulp.src(imageSrc)
        .pipe(plumber()) //plumber给pipe打补丁
        .pipe(changed(staticUrl))
        .pipe(debug({ title: '编译:' }))
        .pipe(imagemin([
            imagemin.gifsicle({ interlaced: true }),
            imagemin.jpegtran({ progressive: true }),
            imagemin.optipng({ optimizationLevel: 5 }),
            imagemin.svgo({
                plugins: [
                    { removeViewBox: true },
                    { cleanupIDs: false }
                ]
            })
        ]))
        .pipe(gulp.dest(staticUrl));
});

//jsp替换css、js文件版本
gulp.task('revJsp', function() {
    return gulp.src(['rev/**/**/*.json', jspSrc])
        .pipe(revCollector())
        .pipe(gulp.dest(programsUrl));
});

//监控文件变化
gulp.task('watch', function() {
    gulp.watch(cxwSrc, ['cxw']);
    gulp.watch(libsSrc, ['devLibs']);
    gulp.watch(cssSrc, ['devCss']);
    gulp.watch(jsSrc, ['devJs']);
    gulp.watch(htmlSrc, ['staticHtml']);
    gulp.watch(imageSrc, ['staicImage']);
});
gulp.task('devLibs', function(cb) {
    runSequence(['staticLibs'], ['revJsp'], cb);
});

gulp.task('devCss', function(cb) {
    runSequence(['staticCss'], ['revJsp'], cb);
});

gulp.task('devJs', function(cb) {
    runSequence(['staticJs'], ['revJsp'], cb);
});

//开发构建
gulp.task('dev', function(cb) {
    runSequence(['cxw'], ['staticLibs'], ['staticCss'], ['staticJs'], ['revJsp'], ['staticHtml'], ['staicImage'], ['watch'], cb);
});