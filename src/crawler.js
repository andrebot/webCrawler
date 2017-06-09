'use strict';

const Request = require('request-promise');
const Cheerio = require('cheerio');

const Crawler = {
  request
};

const _urlRegExp = new RegExp('^http[s]?:\\/\\/(\\w+:{0,1}\\w*@)?(\\S+)(:[0-9]+)?(\\/|\\/([\\w#!:.?+=&%@!\\-\\/]))?');

async function request(url) {
  if (!_urlRegExp.test(url)) {
    throw new Error('Invalid url');
  }

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
