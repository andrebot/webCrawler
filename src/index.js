'use strict';

const Crawler = require('./crawler');

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

if (!parameters.url) {
  throw new Error('No URL was provided. Please run the code with "url=<your_url>" as a parameter');
}

const avenueCodeCrawler = Crawler({
  _crawlOverQueryStrings: parameters.query
});

avenueCodeCrawler.crawlPages(parameters.url).then(function (data) {
  console.log(data);
}).catch(console.error);
