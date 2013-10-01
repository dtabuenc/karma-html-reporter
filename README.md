# karma-html-reporter

> Reporter that formats results in HTML similar to jasmine.

## Installation

The easiest way is to keep `karma-html-reporter` as a devDependency in your `package.json`.
```json
{
  "devDependencies": {
    "karma": "~0.10",
    "karma-html-reporter": "~0.1"
  }
}
```

You can simple do it by:
```bash
npm install karma-html-reporter --save-dev
```

## Configuration
```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    reporters: ['progress', 'html'],

    // the default configuration
    htmlReporter: {
      outputDir: 'karma_html',
      templatePath: __dirname+'/jasmine_template.html'
    }
  });
};
```

You can pass list of reporters as a CLI argument too:
```bash
karma start --reporters html,dots
```

----

For more information on Karma see the [homepage].


[homepage]: http://karma-runner.github.com
