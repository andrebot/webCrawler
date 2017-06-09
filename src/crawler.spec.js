'use strcit';

const mockReq = require('mock-require');
const Cheerio = require('cheerio');
const should  = require('chai').should();

function getDummyHtml () {
 const html = 
  `<html>
    <head>
      <link rel="stylesheet" type="text/css" href="any.css"
      <link rel="stylesheet" type="text/css" href="any2.css"
      <link rel="stylesheet" type="text/css" href="any3.css"
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
      error.toString().should.be.eq('Error: Invalid url');
    }

    try {
      const $ = await this.crawler.requestPage();
    } catch (error) {
      should.exist(error);
      error.toString().should.be.eq('Error: Invalid url');
    }

    try {
      const $ = await this.crawler.requestPage('');
    } catch (error) {
      should.exist(error);
      error.toString().should.be.eq('Error: Invalid url');
    }
  });
});
