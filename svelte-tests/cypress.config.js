const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    baseUrl: 'http://localhost:8080'
  },
  compilerOptions: {
    allowJs: true,
    baseUrl: "../node_modules",
    types: ["cypress", "../support"],
  },
  include: ["**/*.*"],
});
