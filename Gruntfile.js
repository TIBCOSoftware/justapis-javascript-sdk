module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		browserify: {
			dist: {
				files: {
					'dist/ap_gateway.js': ['index.js']
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

	
	// Testing tasks
	grunt.registerTask('test-node', ['jshint', 'mochaTest']);
	grunt.registerTask('test-browser', ['browserify', 'jshint', 'mochify']);
	grunt.registerTask('test', ['test-node', 'test-browser']);

	// Compilation task
	grunt.registerTask('compile', ['browserify', 'jshint', 'watch']);
	
	// Default task(s).
	grunt.registerTask('default', ['compile']);

};