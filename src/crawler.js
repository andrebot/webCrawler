'use strict';

const Request = require('request-promise');
const Cheerio = require('cheerio');
const { URL } = require('url');

const Crawler = {
  requestPage,
  addUrlToCrawl,
  crawlOverLinkElements,
  crawlOverScriptElements
};

const _pagesToVisit = [];
const _contents = [];
let _domain;

async function requestPage(url) {
  _domain = new URL(url);

  const options = {
    url: _domain.href,
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

function crawlOverScriptElements($) {
  const content = [];

  $('script').each(function (index, element) {
    const value = $(element).attr('src');

    if (/.*js/.test(value)) {
      content.push(value);
    }
  });

  return content;
}

async function crawlPage(url) {
  try {
    const $ = await requestPage(url);

    const page = {
      url: url,
      assets: []
    };

    page.assets.concat(crawlOverLinkElements($));
    page.assets.concat(crawlOverScriptElements($));

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
