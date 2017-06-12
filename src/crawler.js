'use strict';

const Request  = require('request-promise');
const Cheerio  = require('cheerio');
const Node_URL = require('url');
const URL = Node_URL.URL;

const Crawler = {
  requestPage,
  crawlPage,
  crawlPages,
  crawlOverLinkElements,
  crawlOverScriptElements,
  crawlOverAnchorElements,
  crawlOverImgElements
};

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
    links: []
  };

  page.details.assets = page.details.assets.concat(crawlOverLinkElements($, urlInfo));
  page.details.assets = page.details.assets.concat(crawlOverScriptElements($, urlInfo));
  page.details.assets = page.details.assets.concat(crawlOverImgElements($, urlInfo));
  page.links = page.links.concat(crawlOverAnchorElements($, urlInfo));

  return page;
}

async function crawlPages(startingUrl) {
  const pagesToVisit = [startingUrl];
  const pagesVisited = {};

  while(pagesToVisit.length > 0) {
    const page = pagesToVisit.pop();

    try {
      const pageContent = await crawlPage(page);

      pagesVisited[page] = pageContent.details;

      pagesToVisit.concat(pageContent.links.reduce((links, link) => {
        if (pagesVisited[link]) {
          return links;
        } else {
          // validate URL to be the same domain as we are crawling
            // if valid add into links
            // if false do not add the link in question
          return links.concat(link);
        }
      }, []));
    } catch (error) {
      console.error(error);
      console.error(`Could not crawl over ${page}.`);
    } finally {
      console.log(`Remaning pages to crawl ${pagesToVisit.length}`);
    }
  }

  console.info('Crawl finished.');

  return Object.keys(pagesVisited).map(key => pagesVisited[key]);
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

    content = content.concat(attrsValues.reduce((validAttrs, attrToValidate) => {
      const value = _verifyAttrValue(attrToValidate, urlInfo.href, extensionRegExp);

      if (value) {
        return validAttrs.concat(value);
      } else {
        return validAttrs;
      }
    }, []));
  });

  return content;
}

function _verifyAttrValue(value, href, extensionRegExp) {
  if (value && extensionRegExp.test(value)) {
    if(/^http/i.test(value)) {
      return value;
    } else {
      return Node_URL.resolve(href, value);
    }
  }

  return null;
}

module.exports = function Factory () {
  return Object.assign({}, Crawler);
}
