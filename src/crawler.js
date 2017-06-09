'use strict';

const Request = require('request-promise');
const Cheerio = require('cheerio');

const Crawler = {
  request
};

async function request(url) {
  const options = {
    url,
    transform: function (body) {
      return Cheerio.load(body);
    }
  }

  try {
    return await Request(options);
  } catch(error) {
    console.error(error);
    console.error(`Could not request from ${url}.`);
  }
}

module.exports = function Factory () {
  return Object.assign({}, Crawler);
}
