var os = require('os');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var mu = require('mu2');


var HtmlReporter = function(baseReporterDecorator, config, emitter, logger, helper, formatError) {
	config = config || {};
	var pkgName = config.suite;
	var log = logger.create('reporter.html');

	var browserResults = {};
	var allMessages = [];
	var pendingFileWritings = 0;
	var fileWritingFinished = function() {
	};

	baseReporterDecorator(this);

	this.adapters = [function(msg) {
		allMessages.push(msg);
	}];

	this.onRunStart = function() {
		allMessages = [];
	};

	this.onBrowserStart = function (browser){
		var timestamp = (new Date()).toISOString().substr(0, 19);
		browserResults[browser.id] = {
			browserName : browser.name,
			browserFullName : browser.fullName,
			'package' : pkgName,
			timestamp : timestamp,
			hostname : os.hostname(),
			suites : {}
		};
	};

	this.onBrowserComplete = function(browser) {
		var browserResult = browserResults[browser.id];
		browserResult.results = browser.lastResult;
		browserResult.output = allMessages;
	};

	this.onRunComplete = function(browsers) {
		pendingFileWritings = browsers.length
		browsers.forEach(function(browser) {
			var results = browserResults[browser.id]

			prepareResults(results);
			var outputDir = config.outputDir || 'karma_html';
			var templatePath = config.templatePath || __dirname + "/jasmine_template.html";
			var template = mu.compileAndRender(templatePath, results);
			template.pause();
			var reportFile = outputDir + '/' + results.browserName + '/index.html';
			var writeStream;
			helper.mkdirIfNotExists(path.dirname(reportFile), function() {

				writeStream = fs.createWriteStream(reportFile, function(err) {
					if (err) {
						log.warn('Cannot write HTML Report\n\t' + err.message);
					} else {
						log.debug('HTML report written to "%s".', reportFile);
					}
				});

				writeStream.on('finish', function() {
					if (!--pendingFileWritings) {
						fileWritingFinished();
					}
					template = null;
				});

				template.pipe(writeStream);
				template.resume();
			});

		});
	}; //HtmlReporter


	this.specSuccess = this.specSkipped = this.specFailure = function(browser, result) {
		var suite = getOrCreateSuite(browser, result);
		suite.specs.push(result);
	};

	// wait for writing all the xml files, before exiting
	emitter.on('exit', function(done) {
		if (pendingFileWritings) {
			fileWritingFinished = done;
		} else {
			done();
		}
	});

	function getOrCreateSuite(browser, result) {
		var suites = browserResults[browser.id].suites;
		var suiteKey = result.suite.join(" ");
		if (suites[suiteKey] === undefined) {
			return suites[suiteKey] = { specs : [] };
		}
		else {
			return suites[suiteKey];
		}
	}

	function prepareResults(browser) {
		browser.suites = suitesToArray(browser.suites);
		var results = browser.results;
		results.hasSuccess = results.success > 0;
		results.hasFailed = results.failed > 0;
		results.hasSkipped = results.skipped > 0;
		browser.failedSuites = getFailedSuites(browser.suites);
		return browser;
	}

	function suitesToArray(suites) {
		return _.map(suites, function(suite, suiteName) {
			var specs = transformSpecs(suite.specs);
			var overallState = getOverallState(specs);
			return { name : suiteName, state : overallState, specs : transformSpecs(suite.specs)};
		});
	}

	function transformSpecs(specs) {
		return _.map(specs, function(spec) {
			var newSpec = _.clone(spec);
			if (spec.skipped) {
				newSpec.state = "skipped";
			}
			else if (spec.success) {
				newSpec.state = "passed";
			}
			else {
				newSpec.state = "failed";
			}
			return newSpec;
		});
	}

	function getOverallState(specs) {
		if (_.any(specs, function(spec) {
			return spec.state === "failed"
		})) {
			return "failed";
		}
		else {
			return "passed";
		}
	}

	function getFailedSuites(suites) {
		return _.filter(suites,function(suite) {
			return suite.state === "failed"
		}).map(function(suite) {
			 var newSuite = _.clone(suite);
			 newSuite.specs = getFailedSpecs(suite.specs);
			 return newSuite;
		 });
	}

	function getFailedSpecs(specs) {
		return _.filter(specs, function(spec) {
			return spec.state === "failed";
		});
	}


};

HtmlReporter.$inject = ['baseReporterDecorator', 'config.htmlReporter', 'emitter', 'logger', 'helper', 'formatError'];

// PUBLISH DI MODULE
module.exports = {
	'reporter:html' : ['type', HtmlReporter]
};
