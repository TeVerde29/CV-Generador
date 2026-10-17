// Karma only picks the browser here; the Angular builder produces the bundle.
//
// The stock `ChromeHeadless` launcher passes the legacy `--headless` flag, which
// recent Chrome builds no longer accept, and the browser never reaches the test
// page. An explicit launcher with `--headless=new` is used instead, plus
// `--remote-debugging-port=0` so it never fights another DevTools session for
// port 9222.
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      jasmine: {},
      clearContext: false,
    },
    jasmineHtmlReporter: {
      suppressAll: true,
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }],
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['ChromeHeadlessCI'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'Chrome',
        flags: [
          '--headless=new',
          '--disable-gpu',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--remote-debugging-port=0',
        ],
      },
    },
    captureTimeout: 120000,
    browserNoActivityTimeout: 60000,
    restartOnFileChange: true,
  });
};
