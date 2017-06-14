'use strict';

const cluster = require('cluster');

if (cluster.isMaster) {
  const CrawlerManager = require('./crawler/crawlerManager');

  const _startingUrl = 'url=';
  const _queryParameter = 'query=';
  const parameters = process.argv.reduce(function (validParameters, parameter) {
    if (parameter.indexOf(_startingUrl) > -1) {
      validParameters.url = parameter.split(_startingUrl)[1];
    } else if (parameter.indexOf(_queryParameter) > -1) {
      validParameters.query = parameter.split(_queryParameter)[1] === 'true';
    }

    return validParameters;
  }, {query: false});

  console.log(parameters);

  if (!parameters.url) {
    throw new Error('No URL was provided. Please re-run with "url=<your_url>" as a parameter');
  }

  const manager = CrawlerManager({
    _crawlOverQueryStrings: parameters.query
  });

  manager.initCrawlers(parameters.url);
} else {
  const Crawler = require('./crawler/crawlerWorker');
  const myWorker = Crawler();

  myWorker.crawlNextPage();
}
