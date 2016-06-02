module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		browserify: {
			dist: {
				files: {
					'dist/<%=pkg.name%>.js': ['index.js']
				},
				options: {
					watch: true
				}
			}
		},

		jshint: {
			lib: ['lib/**/*.js'],
			options: {
				strict: "global",
				devel: true,
				browserify: true
			}
		},

		clean: {
			dist: ['dist/*']
		},

		uglify: {
			dist: {
				options: {
					sourceMap: true
				},
				files: {
					'dist/<%=pkg.name%>.min.js': ['dist/<%=pkg.name%>.js']
				}
			}
		},

		watch: {
			lint: {
				files: ['lib/**/*.js'],
				tasks: ['jshint']
			}
		},

		mochify: {
			tests: {
				src: ['test/browser/*.js']
			}
		},

		mochaTest: {
			tests: {
				src: ['test/node/*.js']
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-mochify');
	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-clean');


	// Testing tasks
	grunt.registerTask('test-node', ['jshint', 'mochaTest']);
	grunt.registerTask('test-browser', ['browserify', 'jshint', 'mochify']);
	grunt.registerTask('test', ['test-node', 'test-browser']);

	// Build distributable
	grunt.registerTask('build', ['clean:dist', 'browserify', 'jshint', 'uglify']);
	// Build and watch
	grunt.registerTask('development', ['build', 'watch']);

	// Default task(s).
	grunt.registerTask('default', ['build']);

};
