'use strict';

const cluster = require('cluster');

if (cluster.isMaster) {
  const CrawlerManager = require('./crawler/crawlerManager');

  const _variable = 'url=';
  const urlToUse = process.argv.reduce(function (url, parameter) {
    if (parameter.indexOf(_variable) > -1) {
      return parameter.split(_variable)[1];
    } else {
      return url;
    }
  }, null);

  if (!urlToUse) {
    throw new Error('No URL was provided. Please re-run with "url=<your_url>" as a parameter');
  }

  const manager = CrawlerManager();

  manager.initCrawlers('http://www.avenuecode.com');
} else {
  const Crawler = require('./crawler/crawlerWorker');
  const myWorker = Crawler();

  myWorker.crawlNextPage();
}
