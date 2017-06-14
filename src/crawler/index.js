'use strict';

const cluster = require('cluster');

if (cluster.isMaster) {
  const CrawlerManager = require('./crawlerManager');
  const manager = CrawlerManager();

  manager.initCrawlers('http://www.avenuecode.com');
} else {
  const Crawler = require('./crawlerWorker');
  const myWorker = Crawler();

  myWorker.crawlNextPage();
}