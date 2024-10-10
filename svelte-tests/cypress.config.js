const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    baseUrl: 'http://localhost:8080',
    reporter: 'mocha-junit-reporter', // Using Mocha JUnit Reporter
    reporterOptions: {
      mochaFile: 'cypress/results/test-output-[hash].xml' // Output path for JUnit report
    },
  },
  compilerOptions: {
    allowJs: true,
    baseUrl: "../node_modules",
    types: ["cypress", "../support"],
  },
  include: ["**/*.*"],
});
