#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');
const documentation = require('documentation');
const runScript = require('runscript');

const apiDataFactory = require('./apiDataFactory.js');
const exampleDataFactory = require('./exampleDataFactory.js');

const pwd = process.cwd();
const isDev = process.argv.indexOf('--dev') > -1;

const pkg = require(path.resolve(pwd, 'package.json'));
const config = require(path.resolve(pwd, 'tui-doc-config.json'));

const {version} = pkg || '1.0.0';
const {
  filePath,
  main,
  fileLink
} = config;

// path of data files
const BASE_DATA_PATH = path.resolve(__dirname, '../src/data');
const LAYOUT_DATA_PATH = `${BASE_DATA_PATH}/layout.json`;
const NAV_DATA_PATH = `${BASE_DATA_PATH}/navigation.json`;
const SEARCH_DATA_PATH = `${BASE_DATA_PATH}/searchKeywords.json`;

const SRC_FILES_PATH = path.resolve(pwd, filePath);
const MAIN_DATA_PATH = path.resolve(pwd, main);

/**
 * Make json file
 * @param {string} fullPath - path + filename
 * @param {object} data - data to make file
 */
function makeJsonFile(fullPath, data) {
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
}

/**
 * Make data for layout(header & footer)
 */
function makeLayoutData() {
  const {
    header,
    footer,
    examples
  } = config;

  if (!header.version) {
    header.version = version;
  }

  const data = {
    header,
    footer,
    fileLink,
    useExample: !!examples
  };

  makeJsonFile(LAYOUT_DATA_PATH, [data]);
}

/**
 * Make data using in main page via config file's option
 */
function makeMainPageData() {
  fs.readFile(MAIN_DATA_PATH, 'utf8', (err, data) => {
    if (err) {
      throw err;
    }

    fs.writeFileSync(`${BASE_DATA_PATH}/README.md`, data);
  });
}

/**
 * Make all data using in component via documentation.js
 */
function makeAllData() {
  documentation.build(SRC_FILES_PATH, {
    shallow: true,
    extension: ['js', 'es6']
  }).then(documentation.formats.json)
    .then(output => {
      let navigation = [];
      let searchKeywords = [];

      const apiData = apiDataFactory.createData(JSON.parse(output));
      const exampleData = exampleDataFactory.createData();

      const allNavData = navigation.concat(apiData.navigation)
        .concat(exampleData.navigation);
      const allSearchData = searchKeywords.concat(apiData.searchKeywords)
        .concat(exampleData.searchKeywords);

      makeJsonFile(NAV_DATA_PATH, allNavData);
      makeJsonFile(SEARCH_DATA_PATH, allSearchData);
    })
    .then(() => {
      build();
    });
}

/**
 * Create data and removing all data files to create
 */
function init() {
  fs.emptyDir(BASE_DATA_PATH, err => {
    if (err) {
      throw err;
    }

    makeLayoutData();
    makeMainPageData();
    makeAllData();
  });
}

/**
 * Build gatsby script
 */
function build() {
  try {
    let versionDir = path.resolve(pwd, `_${version}`);
    let latestDir = path.resolve(pwd, '_latest');
    let cmd;

    if (isDev) {
      cmd = `npm run develop`;
    } else {
      cmd = `npm run build && cp -r public ${versionDir} &&`;
      cmd += `npm run build latest && cp -r public ${latestDir}`;
    }

    process.chdir(path.resolve(__dirname, '../')); // change working directory

    runScript(cmd)
      .then(() => {
        console.log('build success');
      });
  } catch (err) {
    console.error(`chdir: ${err}`);
  }
}

init();
