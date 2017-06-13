'use strcit';

const mockReq = require('mock-require');
const Cheerio = require('cheerio');
const URL     = require('url');
const should  = require('chai').should();

const _returnHtml = {
  fullHtml: `
  <html>
    <head>
      <link rel="stylesheet" type="text/css" href="any.css"/>
      <link rel="stylesheet" type="text/css" href="any2.css"/>
      <link rel="stylesheet" type="text/css" href="https://cdn.com.br/1.1.4/any.css"/>
      <link rel="shortcut icon" href="https://assets.any.com/images/favicon.ico">
      <link rel="apple-touch-icon" href="https://assets.any.com/images/apple-touch-icon-iphone.png">
      <link rel="apple-touch-icon" sizes="72x72" href="https://assets.anny.com/images/apple-touch-icon-ipad.jpeg">
    </head>
    <body>
      <img></img>
      <div>
        <img src="/my/img.gif"></img>
        <img src="/my/img_low.gif" data-original="/my/img_high.png"></img>
        <img src="http://www.pudim.com/br"></img>
      </div>
        <a></a>
      <div>
        <div>
          <a href="/any/thing">Relative link to own page</a>
          <a href="/any/thing">Relative link to own page 2</a>
          <a href="thing">Relative link to own page 2</a>
          <a href="http://www.ahoi.com">Link to another page</a>
        </div>
      </div>

      <script src="/js/lib/generic-framework.js"></script>
      <script src="/js/main.js"></script>
      <script src="/js/vendor.js"></script>
    </body>
  </html>`,
  partialHtmlWithLinks: `
    <div>
      <a href="/any/thing">Relative link to own page</a>
      <a href="/any/thing?anyThing=haha">Relative link to own page</a>
      <a href="thing">Relative link to own page 2</a>
      <a href="http://www.ahoi.com">Link to another page</a>
    </div>
  `,
  default: ''
};

function getDummyHtml () {
  return Cheerio.load(_returnHtml.default);
}

mockReq('request-promise', getDummyHtml);
const Crawler = require('./crawler');

const DUMMY_URL = 'https://www.avenuecode.com';
const DUMMY_BAD_URL = 'mamamia';

function checkIfValidArray(array) {
  should.exist(array);
  array.should.be.an('array');
  array.length.should.be.gt(0);
}

function checkIfValidUrl(url) {
  should.exist(url);
  url.should.not.be.empty;
  url.indexOf('#').should.be.eq(-1);

  try { 
    new URL.URL(url)
  } catch (error) {
    console.error(`Invalid URL ${url}.`);
    should.fail(error, undefined, 'Should hane not thrown an error.');
  }
}

describe('Crawler', function () {
  before(function () {
    this.crawler = Crawler();
  });

  beforeEach(function () {
    _returnHtml.default = _returnHtml.fullHtml;
    this.dummyHtml = getDummyHtml();
  });

  it('Should be able to request a website transpiled by Cheerio', async function () {
    try {
      const $ = await this.crawler.requestPage(DUMMY_URL);

      should.exist($);
      $.should.be.a('function');
      should.exist($('body'));

    } catch(error) {
      should.fail(error, undefined, 'Should have not thrown an error.');
      console.log(error);
    }
  });

  it('Should not accept invalid urls', async function () {
    try {
      const $ = await this.crawler.crawlPage(DUMMY_BAD_URL);
    } catch (error) {
      should.exist(error);
      error.toString().should.be.eq(`TypeError [ERR_INVALID_URL]: Invalid URL: ${DUMMY_BAD_URL}`);
    }

    try {
      const $ = await this.crawler.crawlPage();
    } catch (error) {
      should.exist(error);
      error.toString().should.be.eq('TypeError [ERR_INVALID_URL]: Invalid URL: undefined');
    }

    try {
      const $ = await this.crawler.crawlPage('');
    } catch (error) {
      should.exist(error);
      error.toString().should.be.eq('TypeError [ERR_INVALID_URL]: Invalid URL: ');
    }
  });

  it('Should be able to find all css files and images from link elements', function () {
    const cssFound = this.crawler.crawlOverLinkElements(this.dummyHtml, new URL.URL(DUMMY_URL));

    checkIfValidArray(cssFound);
    cssFound.forEach(function (string) {
      should.exist(string);
      string.should.not.be.empty;
      string.should.match(/^http.*(css|png|jpeg|jpg|ico|gif)$/);
    });
  });

  it('Should be able to find all script files', function () {
    const jsFound = this.crawler.crawlOverScriptElements(this.dummyHtml, new URL.URL(DUMMY_URL));

    checkIfValidArray(jsFound);
    jsFound.forEach(function (string) {
      should.exist(string);
      string.should.not.be.empty;
      string.should.match(/^http.*js$/);
    });
  });

  it('Should be able to find all links in a page', function () {
    const linksFound = this.crawler.crawlOverAnchorElements(this.dummyHtml, new URL.URL(DUMMY_URL));

    checkIfValidArray(linksFound);
    linksFound.forEach(function (string) {
      should.exist(string);
      string.should.not.be.empty;
      string.should.match(/^http/);
    });
  });

  it('Should be able to find all imgs in a page', function () {
    const imgsFound = this.crawler.crawlOverImgElements(this.dummyHtml, new URL.URL(DUMMY_URL));

    checkIfValidArray(imgsFound);
    imgsFound.forEach(function (string) {
      should.exist(string);
      string.should.not.be.empty;
      string.should.match(/^http/);
    });
  });

  it('Should be able to visit all unique links from a page', async function () {
    const pageDetails = await this.crawler.crawlPages(DUMMY_URL);

    checkIfValidArray(pageDetails);
    pageDetails.length.should.be.eq(3);
    pageDetails.forEach(function (details) {
      checkIfValidUrl(details.url);
      checkIfValidArray(details.assets);
      details.assets.forEach(checkIfValidUrl);
    });
  });

  it('Should be able to ignore links with query string', async function () {
    _returnHtml.default = _returnHtml.partialHtmlWithLinks;

    const pageDetails = await this.crawler.crawlPages(DUMMY_URL);

    checkIfValidArray(pageDetails);
    pageDetails.length.should.be.eq(3);
    pageDetails.forEach(function (details) {
      checkIfValidUrl(details.url);
    });
  });

  it('Should be able to crawl links with query string if required', async function () {
    _returnHtml.default = _returnHtml.partialHtmlWithLinks;
    const queryCrawler = Crawler({_crawlOverQueryStrings: true})
    const pageDetails = await queryCrawler.crawlPages(DUMMY_URL);

    checkIfValidArray(pageDetails);
    pageDetails.length.should.be.eq(4);
    pageDetails.forEach(function (details) {
      checkIfValidUrl(details.url);
    });
  });
});
