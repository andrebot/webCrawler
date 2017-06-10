'use strcit';

const mockReq = require('mock-require');
const Cheerio = require('cheerio');
const URL     = require('url');
const should  = require('chai').should();

function getDummyHtml () {
 const html = 
  `<html>
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
        <img></img>
      </div>
      <a></a>
      <div>
        <div>
          <a></a>
        </div>
      </div>

      <script src="/js/lib/generic-framework.js"></script>
      <script src="/js/main.js"></script>
      <script src="/js/vendor.js"></script>
    </body>
  </html>`;

  return Cheerio.load(html);
}

mockReq('request-promise', getDummyHtml);
const Crawler = require('./crawler');

const DUMMY_URL = 'https://www.avenuecode.com';
const DUMMY_BAD_URL = 'mamamia';

describe('Crawler', function () {
  before(function () {
    this.crawler = Crawler();
    this.dummyHtml = getDummyHtml();
  });

  it('Should be able to request a website', async function () {
    try {
      const $ = await this.crawler.requestPage(DUMMY_URL);

      should.exist($);
      $.should.be.a('function');
      should.exist($('body'));

    } catch(error) {
      should.fail(error, undefined, 'Should have not thrown an error.');
    }
  });

  it('Should not accept invalid urls', async function () {
    try {
      const $ = await this.crawler.requestPage(DUMMY_BAD_URL);
    } catch (error) {
      should.exist(error);
      error.toString().should.be.eq(`TypeError [ERR_INVALID_URL]: Invalid URL: ${DUMMY_BAD_URL}`);
    }

    try {
      const $ = await this.crawler.requestPage();
    } catch (error) {
      should.exist(error);
      error.toString().should.be.eq('TypeError [ERR_INVALID_URL]: Invalid URL: undefined');
    }

    try {
      const $ = await this.crawler.requestPage('');
    } catch (error) {
      should.exist(error);
      error.toString().should.be.eq('TypeError [ERR_INVALID_URL]: Invalid URL: ');
    }
  });

  it('Should be able to find all css files and images from link elements', function () {
    const cssFound = this.crawler.crawlOverLinkElements(this.dummyHtml);

    should.exist(cssFound);
    cssFound.should.be.an('array');
    cssFound.length.should.be.gt(0);
    cssFound.forEach(function (string) {
      should.exist(string);
      string.should.not.be.empty;
      string.should.match(/.*(css|png|jpeg|jpg|ico|gif)$/);
    });
  });

  it('Should be able to find all script files', function () {
    const jsFound = this.crawler.crawlOverScriptElements(this.dummyHtml);

    const scriptsFound = this.crawler.crawlOverScriptElements(this.dummyHtml);

    should.exist(jsFound);
    jsFound.should.be.an('array');
    jsFound.length.should.be.gt(0);
    jsFound.forEach(function (string) {
      should.exist(string);
      string.should.not.be.empty;
      string.should.match(/.*js$/);
    });
  });
});
