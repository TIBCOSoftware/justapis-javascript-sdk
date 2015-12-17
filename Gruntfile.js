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
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-browserify');

	grunt.registerTask('compile', ['browserify', 'jshint', 'watch']);

	// Default task(s).
	grunt.registerTask('default', ['compile']);

};