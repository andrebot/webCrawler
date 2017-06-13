'use strict';

const Crawler = require('./crawler');

const _variable = 'url=';
const avenueCodeCrawler = Crawler();

const urlToUse = process.argv.reduce(function (url, parameter) {
  if (parameter.indexOf(_variable) > -1) {
    return parameter.split(_variable)[1];
  } else {
    return url;
  }
}, null);

if (!urlToUse) {
  throw new Error('No URL was provided. Please run the code with "url=<your_url>" as a parameter');
}

avenueCodeCrawler.crawlPages(urlToUse).then(function (data) {
  console.log(data);
}).catch(console.error);
