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
            options: { separator: ';' + grunt.util.linefeed },
            src: ['src/engine/libs/*.js', 'src/engine/*.js'],
            dest: 'dist/js/Danimator.js'
        },
        audio: {
            options: { separator: ';' + grunt.util.linefeed },
            src: ['src/audio/libs/*.js', 'src/audio/*.js'],
            dest: 'dist/js/Danimator.audio.js'
        },
        editor: {
            options: { separator: ';' + grunt.util.linefeed },
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
        audio:  { files: {'dist/js/Danimator.audio.min.js': ['dist/js/Danimator.audio.js'] }},
        editor: { files: {'dist/js/Danimator.editor.min.js': ['build/js/Danimator.editor.js'] }, options: { sourceMap: false }}
    },
    watch: {
      engine: {
        files: ['src/engine/*.js', 'src/engine/*/*.js'],
        tasks: ['concat:engine', 'uglify:engine']
      },
      audio: {
        files: ['src/audio/*.js', 'src/audio/*/*.js'],
        tasks: ['concat:audio', 'uglify:audio']
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