'use strict';

const Request  = require('request-promise');
const Cheerio  = require('cheerio');
const Node_URL = require('url');
const URL = Node_URL.URL;

/**
 * Object which can crawl over pages. It will not go under subdomains but will crawl ovar all paths
 * in a page and compile a list of assets found in that page.
 * 
 * @namespace {Object} Crawler
 */

/**
 * @typedef {Object} PageAssets
 * @property {String} url URL representing which page are this results
 * @property {String[]} assets Links to all assets used in this pafe.
 */

/**
 * @typedef {Object} CrawlingResult
 * @property {PageAssets} details All page assets
 * @property {String[]} assets Valid links found in this page
 */

const Crawler = {
  requestPage,
  crawlPage,
  crawlPages,
  crawlOverLinkElements,
  crawlOverScriptElements,
  crawlOverAnchorElements,
  crawlOverImgElements,
  crawlOverElementsWithStyleAttribute,
  _crawlOverQueryStrings: false
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
/**
 * Regular expression for isolation the URL value from a 'background' attribute.
 * 
 * @var {ReagExp} _cssBackgroundClearRegExp
 * @memberof Crawler
 * @private
 */
const _cssBackgroundClearRegExp = /(url\(|"|\)|')/g;

/**
 * Request a page form the URL provided. The body of the request will be parsed by Cheerio
 * so we can crawl over it in a JQuery like environment.
 * 
 * @throws {RequestError}
 * @throws {StatusCodeError}
 * @throws {TransformError}
 * @memberof Crawler
 * @param {String} url full URL to the page
 * @returns {Promise} which will have it's data parsed by Cheerio
 */
async function requestPage(url) {
  return await Request({
    url,
    transform: function (body) {
      return Cheerio.load(body);
    }
  });
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
 * Crawl over page to get all assets and links.
 * 
 * @throws {ERR_INVALID_URL}
 * @throws {RequestError}
 * @throws {StatusCodeError}
 * @throws {TransformError}
 * @param {String} url Full URL to a page which will be crawled
 * @returns {CrawlingResult} All info found in the crawled page
 */
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
      console.error(`There was an error parsing ${link} as an URL. Moving forward.`);

      return links;
    }
  }, []));

  return page;
}

/**
 * Crawls over all unique links found in the URL provided. It will return all assets found in each
 * page crawled.
 * 
 * @memberof Crawler
 * @param {String} startingUrl url which will be used to start the crawling. Should be a full URL
 * @returns {PageAssets[]} Crawling results.
 */
async function crawlPages(startingUrl) {
  let pagesToVisit = [startingUrl];
  const pagesVisited = {};

  console.log(`Starting crawler on ${startingUrl}`);
  while(pagesToVisit.length > 0) {
    const page = pagesToVisit.pop();

    try {
      const pageContent = await crawlPage(page);

      pagesVisited[page] = pageContent.details;

      pagesToVisit = pagesToVisit.concat(pageContent.links.reduce((links, link) => {
        // Removing fragment
        const validLink = _clearLink(link, this._crawlOverQueryStrings);

        if (pagesVisited[validLink]) {
          return links;
        } else {
          pagesVisited[validLink] = true;
          return links.concat(validLink);
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

/**
 * Removes fragments and query parameters from a link so we do not crawl over unecessery
 * links. We can toggle off the query string removal to allow to crawl over a page with
 * this kind of modifier.
 * 
 * @memberof Crawler
 * @private
 * @param {String} link Link to be clean
 * @param {Boolean} crawlOverQueryStrings toggle the query string parameters removal
 * @returns {String} clean link
 */
function _clearLink (link, crawlOverQueryStrings) {
  let validLink = link.split('#')[0];

  if (!crawlOverQueryStrings && validLink.indexOf('?') > -1) {
    validLink = validLink.split('?')[0];
  }

  return validLink;
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
 * Crawler composer.
 * 
 * @param {Object} opt 
 * @param {Boolean} opt._crawlOverQueryStrings toggle usage of query params in url
 * @returns 
 */
module.exports = function Factory (opt) {
  return Object.assign({}, Crawler, opt);
}
