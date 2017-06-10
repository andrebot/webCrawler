'use strict';

const Request = require('request-promise');
const Cheerio = require('cheerio');
const Util    = require('./util');

const Crawler = {
  requestPage,
  addUrlToCrawl,
  crawlOverLinkElements
};

const _util = Util();
const _pagesToVisit = [];
const _contents = [];
const _domain = '';
const _urlRegExp = new RegExp('^http[s]?:\\/\\/(\\w+:{0,1}\\w*@)?(\\S+)(:[0-9]+)?(\\/|\\/([\\w#!:.?+=&%@!\\-\\/]))?');

async function requestPage(url) {
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

function crawlOverLinkElements ($) {
  const content = [];

  $('link').each(function (index, element) {
    const value = $(element).attr('href');

    if (/.*(css|png|jpeg|jpg|ico|gif)/i.test(value)) {
      content.push(value);
    }

  });

  return content;
}

async function crawlPage(url) {
  try {
    const $ = await requestPage(url);
    _domain = _util.extractHostname(url);

    const page = {
      url: url,
      assets: []
    };

    page.assets.concat(crawlOverLinkElements($));

    // $('a').each(function (index, element) {
    //   const link = $(element).attr('href');

    //   /*if (is a valid domain) {
    //     addUrlToCrawl();
    //   }*/
    // });

    // $('script').each(function (index, element) {

    // });
  } catch (error) {
    if (error.message === 'Invalid url') {
      console.log('We couldn\`t get the page due to malformed URL, please try again with a valid URL.')
    }

    throw error;
  }
}

function addUrlToCrawl(url) {
  _pagesToVisit.push(url);
}

async function crawlPages() {
  while(_pagesToVisit.length > 0) {
    const pageContent = await crawlPage(_pagesToVisit.pop());

    _contents.push(pageContent);
  }

  console.log('Crawl finished.');
}

module.exports = function Factory () {
  return Object.assign({}, Crawler);
}
