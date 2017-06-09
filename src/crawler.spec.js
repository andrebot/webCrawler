'use strcit';

const mockReq = require('mock-require');
const Cheerio = require('cheerio');
const should  = require('chai').should();

mockReq('request-promise', async function () {
  return Cheerio.load('<html><head></head><body></body></html>');
});
const Crawler = require('./crawler');

const DUMMY_URL = 'https://www.avenuecode.com';
const DUMMY_BAD_URL = 'mamamia';

describe('Crawler', function () {
  before(function () {
    this.crawler = Crawler();
  });

  it('Should be able to request a website', async function () {
    try {
      const $ = await this.crawler.request(DUMMY_URL);

      should.exist($);
      $.should.be.a('function');
      should.exist($('body'));

    } catch(error) {
      should.fail(error, undefined, 'Should have not thrown an error.');
    }
  });

  it('Should not accept invalid urls', async function () {
    try {
      const $ = await this.crawler.request(DUMMY_BAD_URL);
    } catch (error) {
      should.exist(error);
      error.toString().should.be.eq('Error: Invalid url');
    }

    try {
      const $ = await this.crawler.request();
    } catch (error) {
      should.exist(error);
      error.toString().should.be.eq('Error: Invalid url');
    }

    try {
      const $ = await this.crawler.request('');
    } catch (error) {
      should.exist(error);
      error.toString().should.be.eq('Error: Invalid url');
    }
  });
});
