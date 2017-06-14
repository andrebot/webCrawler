'use strict';

const cluster = require('cluster');

if (cluster.isMaster) {
  const CrawlerManager = require('./crawlerManager');
  const manager = CrawlerManager();

  console.log('Setting up manager');

  manager.initCrawlers('http://www.avenuecode.com');
} else {
  const Crawler = require('./crawlerWorker');
  const myWorker = Crawler();

  console.log('Worker Up! Requesting next page to crawl!');
  myWorker.crawlNextPage();
}