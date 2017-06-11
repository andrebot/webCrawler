'use strict';

const Request = require('request-promise');
const Cheerio = require('cheerio');
const { URL } = require('url');

const Crawler = {
  requestPage,
  addUrlToCrawl,
  crawlPage,
  crawlOverLinkElements,
  crawlOverScriptElements
};

const _pagesToVisit = [];
const _contents = [];

async function requestPage(url) {
  return await Request({
    url,
    transform: function (body) {
      return Cheerio.load(body);
    }
  });
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

function crawlOverAnchorElements($) {
  
}

async function crawlPage(url) {
  const urlInfo = new URL(url);
  const $ = await requestPage(urlInfo.href);

  const page = {
    url,
    assets: [],
    links:  []
  };

  page.assets.concat(crawlOverLinkElements($));
  page.assets.concat(crawlOverScriptElements($));
  page.links.concat(crawlOverAnchorElements($));

  // $('a').each(function (index, element) {
  //   const link = $(element).attr('href');

  //   /*if (is a valid domain) {
  //     addUrlToCrawl();
  //   }*/
  // });

  // $('script').each(function (index, element) {

  // });

  return page;
}

function addUrlToCrawl(url) {
  _pagesToVisit.push(url);
}

async function crawlPages() {
  while(_pagesToVisit.length > 0) {
    const page = _pagesToVisit.pop();

    try {
      const pageContent = await crawlPage(page);

      _contents.push(pageContent);
    } catch (error) {
      console.error(error);
      console.error(`Could not crawl over ${page}.`);
    } finally {
      console.log(`Remaning pages to crawl ${_pagesToVisit.length}`);
    }
    
  }

  console.info('Crawl finished.');
}

module.exports = function Factory () {
  return Object.assign({}, Crawler);
}
