'use strict';

const Request  = require('request');
const Cheerio  = require('cheerio');
const Node_URL = require('url');
const URL = Node_URL.URL;

const CrawlerWorker = {
  crawlPage,
  crawlNextPage
};

/**
 * Regular expression for valid content file's extension
 * 
 * @var {RegExp} _contentRegExp
 * @memberof Crawler
 * @private
 */
const _contentRegExp = /.*(css|png|jpeg|jpg|ico|gif)/i;
/**
 * Regular expression for valid JavaScript file's extension
 * 
 * @var {RegExp} _jsRegExp
 * @memberof Crawler
 * @private
 */
const _jsRegExp = /.*js/i;
/**
 * Regular expression for valid image file's extension
 * 
 * @var {RegExp} _imgRegExp
 * @memberof Crawler
 * @private
 */
const _imgRegExp = /.*(png|jpeg|jpg|gif)/i;
/**
 * Regular expression for valid URL prefix
 * 
 * @var {RegExp} _validURLPrefix
 * @memberof Crawler
 * @private
 */
const _validURLPrefix = /^http/i;
/**
 * Regular expression for anything
 * 
 * @var {RegExp} _anyRegExp
 * @memberof Crawler
 * @private
 */
const _anyRegExp = /.*/i;

function crawlNextPage() {
  process.send({
    type: 'firstTask',
    from: process.pid,
    data: {}
  });
}

/**
 * Request a page form the URL provided. The body of the request will be parsed by Cheerio
 * so we can crawl over it in a JQuery like environment.
 * 
 * @throws {RequestError}
 * @throws {StatusCodeError}
 * @throws {TransformError}
 * @memberof Crawler
 * @param {string} url full URL to the page
 * @returns 
 */
function crawlPage(url) {
  try {
    const urlInfo = new URL(url);

    Request(url, function (error, response, body) {
      if (error) {
        const msg = `There was an error trying to get page for ${url}. Moving forward.`;

        _handleError(error, url, msg);
      } else if (response && response.statusCode === 200) {
        _crawlPage(urlInfo, Cheerio.load(body));
      } else {
        const msg = `There was an error trying to get page for ${url}, response with status ${response.statusCode}. Moving forward.`;

        _handleError(error, url, msg);
      }
    });
  } catch (error) {
    const msg = `There was an error validating the URL: ${url}. Moving forward.`;
    _handleError(error, url, msg);
  }
}

function _handleError(error, url, msg) {
  console.error(error);
  console.log(msg);

  process.send({
    type: 'nextTask',
    from: process.pid,
    data: {}
  });
}

/**
 * Crawl over page to get all assets and links.
 * 
 * @throws {ERR_INVALID_URL}
 * @throws {RequestError}
 * @throws {StatusCodeError}
 * @throws {TransformError}
 * @param {string} url Full URL to a page which will be crawled
 * @returns {CrawlingResult} All info found in the crawled page
 */
function _crawlPage(urlInfo, $) {
  const page = {
    details: {
      url: urlInfo.href,
      assets: [],
    },
    links: []
  };

  page.details.assets = page.details.assets.concat(crawlOverLinkElements($, urlInfo));
  page.details.assets = page.details.assets.concat(crawlOverScriptElements($, urlInfo));
  page.details.assets = page.details.assets.concat(crawlOverImgElements($, urlInfo));
  page.links = page.links.concat(crawlOverAnchorElements($, urlInfo).reduce(function (links, link) {
    try {
      const testUrl = new URL(link);

      if (testUrl.origin === urlInfo.origin) {
        return links.concat(link);
      } else {
        return links;
      }
    } catch (error) {
      console.error(`${process.pid}: There was an error parsing ${link} as an URL. Going forward.`);

      return links;
    }
  }, []));

  process.send({
    type: 'nextTask',
    from: process.pid,
    data: {
      page
    }
  });
}

/**
 * Crawl over <link> elements.
 * 
 * @memberof Crawler
 * @param {Cheerio} $ Cheerio loaded HTML object to interact with its elements
 * @param {URL} urlInfo Node's URL object
 * @returns {string[]} array with all assets found in this element
 */
function crawlOverLinkElements ($, urlInfo) {
  return _crawlOverElement('link', 'href', $, urlInfo, _contentRegExp);
}

/**
 * Crawl over <script> elements.
 * 
 * @memberof Crawler
 * @param {Cheerio} $ Cheerio loaded HTML object to interact with its elements
 * @param {URL} urlInfo Node's URL object
 * @returns {string[]} array with all assets found in this element
 */
function crawlOverScriptElements($, urlInfo) {
  return _crawlOverElement('script', 'src', $, urlInfo, _jsRegExp);
}

/**
 * Crawl over <a> elements.
 * 
 * @memberof Crawler
 * @param {Cheerio} $ Cheerio loaded HTML object to interact with its elements
 * @param {URL} urlInfo Node's URL object
 * @returns {string[]} array with all links found in this element
 */
function crawlOverAnchorElements($, urlInfo) {
  return _crawlOverElement('a', 'href', $, urlInfo, _anyRegExp);
}

/**
 * Crawl over <img> elements.
 * 
 * @memberof Crawler
 * @param {Cheerio} $ Cheerio loaded HTML object to interact with its elements
 * @param {URL} urlInfo Node's URL object
 * @returns {string[]} array with all assets found in this element
 */
function crawlOverImgElements($, urlInfo) {
  return _crawlOverElement('img', '', $, urlInfo, _imgRegExp);
}

/**
 * Retrieve all valid values defined by the criteria especified from all elements found using
 * the selector provided.
 * 
 * @memberof Crawler
 * @private
 * @param {string} selector defines which elements we are crawling
 * @param {string} [attr] defines which attribute should be crawled. None means to crawl over all.
 * @param {Cheerio} $ Cheerio loaded HTML object to interact with its elements
 * @param {URL} urlInfo Node's URL object
 * @param {RegExp} extensionRegExp Regular expression defining which are the valid extensions
 * @returns {string[]} Strings with all valid values founded.
 */
function _crawlOverElement (selector, attr, $, urlInfo, extensionRegExp) {
  let content = [];

  $(selector).each(function (index, element) {
    let attrsValues = [];

    if (attr) {
      attrsValues.push($(element).attr(attr));
    } else {
      const elementAttrs = $(element).attr();
      attrsValues = attrsValues.concat(Object.keys(elementAttrs).map(key => elementAttrs[key]));
    }

    content = content.concat(attrsValues.reduce(function (validAttrs, attrToValidate) {
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

/**
 * Verify if the value provided have the extension we are looking for and if it is a full or
 * relative URL.
 * 
 * @memberof Crawler
 * @private
 * @param {string} value Element's attribute value
 * @param {string} href Page's origin URL
 * @param {RegExp} extensionRegExp Regular expression which defines which extension we a looking for
 * @returns {string} Full path of the resource found
 */
function _verifyAttrValue(value, href, extensionRegExp) {
  if (value && extensionRegExp.test(value)) {
    if(_validURLPrefix.test(value)) {
      return value;
    } else {
      return Node_URL.resolve(href, value);
    }
  }

  return null;
}

module.exports = function Factoty() {
  const newCrawler = Object.assign({}, CrawlerWorker);

  process.on('message', function (msg) {
    if (msg.type === 'crawlPage') {
      newCrawler.crawlPage(msg.data.url);
    }
  });

  return newCrawler;
}
