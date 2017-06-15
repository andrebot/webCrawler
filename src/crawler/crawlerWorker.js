'use strict';

const Request  = require('request');
const Cheerio  = require('cheerio');
const Node_URL = require('url');
const URL = Node_URL.URL;

/**
 * This is the worker which will actually crawl over the pages. Each worker crawls over one page
 * at a time, compiling a list of assets found in that page.
 * 
 * @namespace {Object} CrawlerWorker
 */

/**
 * @typedef {Object} PageAssets
 * @property {String} url URL representing which page are this results
 * @property {String[]} assets Links to all assets used in this pafe.
 */

/**
 * @typedef {Object} CrawlingResult
 * @property {PageAssets} details All page assets
 * @property {String[]} links Valid links found in this page
 */

/**
 * @typedef {Object} CrawlerEventData
 * @property {CrawlingResult} page All data retrieved from the crawl
 */

/**
 * @typedef {Object} CrawlerEvent
 * @property {String} type Type of the 'message' event
 * @property {Number} from PID of the worker who emitted the event
 * @property {CrawlerEventData} data All data relevant to this event type
 */

const CrawlerWorker = {
  crawlPage,
  crawlNextPage,
  crawlOverLinkElements,
  crawlOverScriptElements,
  crawlOverAnchorElements,
  crawlOverImgElements
};

/**
 * Regular expression for valid content file's extension
 * 
 * @var {RegExp} _contentRegExp
 * @memberof CrawlerWorker
 * @private
 */
const _contentRegExp = /.*(css|png|jpeg|jpg|ico|gif)/i;
/**
 * Regular expression for valid JavaScript file's extension
 * 
 * @var {RegExp} _jsRegExp
 * @memberof CrawlerWorker
 * @private
 */
const _jsRegExp = /.*js/i;
/**
 * Regular expression for valid image file's extension
 * 
 * @var {RegExp} _imgRegExp
 * @memberof CrawlerWorker
 * @private
 */
const _imgRegExp = /.*(png|jpeg|jpg|gif)/i;
/**
 * Regular expression for valid URL prefix
 * 
 * @var {RegExp} _validURLPrefix
 * @memberof CrawlerWorker
 * @private
 */
const _validURLPrefix = /^http/i;
/**
 * Regular expression for anything
 * 
 * @var {RegExp} _anyRegExp
 * @memberof CrawlerWorker
 * @private
 */
const _anyRegExp = /.*/i;
/**
 * Regular expression for isolation the URL value from a 'background' attribute.
 * 
 * @var {ReagExp} _cssBackgroundClearRegExp
 * @memberof Crawler
 * @private
 */
const _cssBackgroundClearRegExp = /(url\(|"|\)|')/g;

/**
 * Sends a message through the IPC to the main thread (Crawler manager) to request a URL to be
 * crawled. It sends {@link CrawlerEvent} to the main thread with the type of 'firstTask'.
 * 
 * @memberof CrawlerWorker
 * @fires process#message Node process event which will be listened by the main thread.
 */
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
 * @memberof CrawlerWorker
 * @param {String} url full URL to the page
 */
function crawlPage(url) {
  try {
    const urlInfo = new URL(url);

    Request(url, function (error, response, body) {
      if (error) {
        const msg = `There was an error trying to get page for ${url}. Moving forward.`;

        _handleError(error, msg);
      } else if (response && response.statusCode === 200) {
        _crawlPage(urlInfo, Cheerio.load(body));
      } else {
        const msg = `There was an error trying to get page for ${url}, response with status ${response.statusCode}. Moving forward.`;

        _handleError(error, msg);
      }
    });
  } catch (error) {
    const msg = `There was an error validating the URL: ${url}. Moving forward.`;
    _handleError(error, msg);
  }
}

/**
 * Crawl over <link> elements.
 * 
 * @memberof Crawler
 * @param {Cheerio} $ Cheerio loaded HTML object to interact with its elements
 * @param {URL} urlInfo Node's URL object
 * @returns {String[]} array with all assets found in this element
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
 * @returns {String[]} array with all assets found in this element
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
 * @returns {String[]} array with all links found in this element
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
 * @returns {String[]} array with all assets found in this element
 */
function crawlOverImgElements($, urlInfo) {
  return _crawlOverElement('img', '', $, urlInfo, _imgRegExp);
}

/**
 * Crawl over all elements with inline style to extract the background img from each.
 * 
 * @param {Cheerio} $ Cheerio loaded HTML object to interact with its elements
 * @param {URL} urlInfo Node's URL object
 * @returns {String[]} array with all links from inline style
 */
function crawlOverElementsWithStyleAttribute($, urlInfo) {
  const images = [];

  $('[style]').each(function (index, element) {
    let image = $(element).css('background-image');

    if (!image) {
      image = $(element).css('background');

      if (image) {
        // cleaning up background value to extract just the value inside the url()
        image = image.split('url(')[1].split(' ')[0];
      }
    }

    if (image) {
      const validUrl = _verifyAttrValue(image.replace(_cssBackgroundClearRegExp, ''), urlInfo.origin, _anyRegExp);

      if (validUrl) {
        images.push(validUrl);
      }
    }
  });

  return images;
}

/**
 * Error handler for CrawlerWorker. It will log the error, log a custom message, if available
 * and send a message to the main thread (Crawler manager)  asking for a new URL to crawl.
 * Errors are silent so we can keep crawling. It sends a {@link CrawlerEvent} with type
 * 'nextTask'.
 * 
 * @fires process#message Node process event which will be listened by the main thread.
 * @param {Error} error The Error catched
 * @param {String} [msg] Custom message to be shown in the stdout
 */
function _handleError(error, msg) {
  console.error(error);

  if (msg) {
    console.log(msg);
  }

  process.send({
    type: 'nextTask',
    from: process.pid,
    data: {}
  });
}

/**
 * Crawl over page to get all assets and links. In the end it emits a 'message' event
 * to the main process with {@link CrawlerEvent} with the type 'nextTask' containing
 * all data crawled.
 * 
 * @throws {ERR_INVALID_URL}
 * @throws {RequestError}
 * @throws {StatusCodeError}
 * @throws {TransformError}
 * @fires process#message Node process event which will be listened by the main thread.
 * @param {String} url Full URL to a page which will be crawled
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
  page.details.assets = page.details.assets.concat(crawlOverElementsWithStyleAttribute($, urlInfo));
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
 * Retrieve all valid values defined by the criteria especified from all elements found using
 * the selector provided.
 * 
 * @memberof Crawler
 * @private
 * @param {String} selector defines which elements we are crawling
 * @param {String} [attr] defines which attribute should be crawled. None means to crawl over all.
 * @param {Cheerio} $ Cheerio loaded HTML object to interact with its elements
 * @param {URL} urlInfo Node's URL object
 * @param {RegExp} extensionRegExp Regular expression defining which are the valid extensions
 * @returns {String[]} Strings with all valid values founded.
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
 * @param {String} value Element's attribute value
 * @param {String} href Page's origin URL
 * @param {RegExp} extensionRegExp Regular expression which defines which extension we a looking for
 * @returns {String} Full path of the resource found
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

/**
 * CrawlerWorker composer. Sets up the worker and hook a listener to the main process event
 * 'message', so we could listen to the main thread (Crawler Manager)
 * 
 * @returns a new CrawlerWorker instance.
 */
module.exports = function Factoty() {
  const newCrawler = Object.assign({}, CrawlerWorker);

  process.on('message', function (msg) {
    if (msg.type === 'crawlPage') {
      newCrawler.crawlPage(msg.data.url);
    }
  });

  return newCrawler;
}
