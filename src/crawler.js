'use strict';

const Request = require('request-promise');
const Cheerio = require('cheerio');
const nodeUrl = require('url');
const URL = nodeUrl.URL;

const Crawler = {
  requestPage,
  addUrlToCrawl,
  crawlPage,
  crawlOverLinkElements,
  crawlOverScriptElements,
  crawlOverAnchorElements
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

function crawlOverLinkElements ($, urlInfo) {
  const regExp = /.*(css|png|jpeg|jpg|ico|gif)/i;

  return _crawlOverElement('link', 'href', $, urlInfo, regExp);
}

function crawlOverScriptElements($, urlInfo) {
  const regExp = /.*js/i;

  return _crawlOverElement('script', 'src', $, urlInfo, regExp);
}

function crawlOverAnchorElements($, urlInfo) {
  const regExp = /.*/i;

  return _crawlOverElement('a', 'href', $, urlInfo, regExp);
}

async function crawlPage(url) {
  const urlInfo = new URL(url);
  const $ = await requestPage(urlInfo.href);

  const page = {
    details: {
      url,
      assets: [],
    },
    links:  []
  };

  page.details.assets = page.details.assets.concat(crawlOverLinkElements($, urlInfo));
  page.details.assets = page.details.assets.concat(crawlOverScriptElements($, urlInfo));
  page.links = page.links.concat(crawlOverAnchorElements($, urlInfo));

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

      _contents.push(pageContent.details);

      // refactor this to not revist links already crawled over
      _pagesToVisit.concat(pageContent.links);
    } catch (error) {
      console.error(error);
      console.error(`Could not crawl over ${page}.`);
    } finally {
      console.log(`Remaning pages to crawl ${_pagesToVisit.length}`);
    }
    
  }

  console.info('Crawl finished.');
}

function _crawlOverElement (selector, attr, $, urlInfo, extensionRegExp) {
  const content = [];

  $(selector).each(function (index, element) {
    const value = $(element).attr(attr);

    if (value && extensionRegExp.test(value)) {

      if(/^http/i.test(value)) {
        content.push(value);
      } else {
        content.push(nodeUrl.resolve(urlInfo.href, value));
      }
    }
  });

  return content;
}

module.exports = function Factory () {
  return Object.assign({}, Crawler);
}
