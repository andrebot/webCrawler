'use strict';

const Crawler = require('./crawler');

const avenueCodeCrawler = Crawler();

avenueCodeCrawler.crawlPages('http://www.avenuecode.com').then(function (data) {
  console.log(data);
}).catch(console.error);
