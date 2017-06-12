'use strict';

const Request  = require('request-promise');
const Cheerio  = require('cheerio');
const Node_URL = require('url');
const without  = require('lodash/without');
const URL = Node_URL.URL;

const Crawler = {
  requestPage,
  addUrlToCrawl,
  crawlPage,
  crawlOverLinkElements,
  crawlOverScriptElements,
  crawlOverAnchorElements,
  crawlOverImgElements
};

const _pagesToVisit = [];
const _contents = [];
const _contentRegExp = /.*(css|png|jpeg|jpg|ico|gif)/i;
const _jsRegExp = /.*js/i;
const _imgRegExp = /.*(png|jpeg|jpg|gif)/i;
const _anyRegExp = /.*/i;

async function requestPage(url) {
  return await Request({
    url,
    transform: function (body) {
      return Cheerio.load(body);
    }
  });
}

function crawlOverLinkElements ($, urlInfo) {
  return _crawlOverElement('link', 'href', $, urlInfo, _contentRegExp);
}

function crawlOverScriptElements($, urlInfo) {
  return _crawlOverElement('script', 'src', $, urlInfo, _jsRegExp);
}

function crawlOverAnchorElements($, urlInfo) {
  return _crawlOverElement('a', 'href', $, urlInfo, _anyRegExp);
}

function crawlOverImgElements($, urlInfo) {
  return _crawlOverElement('img', 'src', $, urlInfo, _imgRegExp);
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
  page.details.assets = page.details.assets.concat(crawlOverImgElements($, urlInfo));
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
  let content = [];

  $(selector).each(function (index, element) {
    const attrsValues = [];

    if (attr) {
      attrsValues.push($(element).attr(attr));
    } else {
      const elementAttrs = $(element).attr();
      attrsValues = attrsValues.concat(Object.keys(elementAttrs).map(key => elementAttrs[key]));
    }

    content = content.concat(attrsValues.map(attrValue => _verifyAttrValue(attrValue, urlInfo.href, extensionRegExp)));
  });

  return without(content, undefined, null, '');
}

function _verifyAttrValue(value, href, extensionRegExp) {
  if (value && extensionRegExp.test(value)) {
    if(/^http/i.test(value)) {
      return value;
    } else {
      return Node_URL.resolve(href, value);
    }
  }
}

module.exports = function Factory () {
  return Object.assign({}, Crawler);
}
