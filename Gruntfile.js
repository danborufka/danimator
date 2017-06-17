module.exports = function(grunt) {
  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    sass: {
        editor: {
            src: 'src/editor/editor.scss',
            dest: 'build/css/editor.css'
        }
    },
    concat: {
        engine: {
            options: { separator: ';' },
            src: ['src/engine/libs/*.js', 'src/engine/*.js'],
            dest: 'dist/js/Danimator.js'
        },
        editor: {
            options: { separator: ';' },
            src: ['src/editor/libs/*.js','src/editor/*.js'],
            dest: 'build/js/Danimator.editor.js'
        },
        styles: {
            src: ['src/editor/libs/*.css', 'build/css/editor.css'],
            dest: 'build/css/Danimator.editor.css'
        }
    },
    cssmin: {
        editor: {
            src: 'build/css/Danimator.editor.css',
            dest:'dist/css/Danimator.editor.min.css'
        }
    },
    uglify: {
        options: {
            banner: '/*! <%= pkg.name %> v<%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
            compress: {},
            mangle: true,
            sourceMap: true
        },
        engine: { files: {'dist/js/Danimator.min.js': ['dist/js/Danimator.js'] }},
        editor: { files: {'dist/js/Danimator.editor.min.js': ['build/js/Danimator.editor.js'] }, options: { sourceMap: false }}
    },
    watch: {
      engine: {
        files: ['src/engine/*.js', 'src/engine/*/*.js'],
        tasks: ['concat:engine', 'uglify:engine']
      },
      editor: {
        files: ['src/editor/*.js', 'src/editor/*/*.js'],
        tasks: ['concat:editor', 'uglify:editor']
      },
      styles: {
        files: ['src/editor/*.scss'],
        tasks: ['sass', 'concat:styles', 'cssmin']
      }
    }
  });

  require('load-grunt-tasks')(grunt);
  grunt.registerTask('default', ['sass', 'concat', 'cssmin', 'uglify', 'watch']);
};