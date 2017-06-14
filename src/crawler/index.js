'use strict';

const cluster = require('cluster');

if (cluster.isMaster) {
  const CrawlerManager = require('./crawlerManager');
  const manager = CrawlerManager();

  manager.setUpWorkers(['https://www.avenuecode.com', 'https://www.avenuecode.com/events']);
} else {
  const Crawler = require('./crawlerWorker');

  console.log('Worker have just begun executing.');
  const myWorker = Crawler();

  process.on('message', function (msg) {
    if (msg.type === 'crawlPage') {
      myWorker.crawlPage(msg.data.url);
    }
  });

  process.send({
    type: 'nextTask',
    from: process.pid,
    data: {}
  });
}