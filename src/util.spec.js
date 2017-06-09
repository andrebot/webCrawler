'use strcit';

const Cheerio = require('cheerio');
const should  = require('chai').should();
const Util    = require('./util');

describe('Utils', function () {
  const DUMMY_URL = 'http://www.avenuecode.com/events';

  before(function () {
    this.util = Util();
  });

  it('Should be able to extract the hostname of an url', function () {
    const hostname = this.util.extractHostname(DUMMY_URL);

    should.exist(hostname);
    hostname.should.not.be.empty;
    hostname.indexOf('http://').should.be.eq(-1);
    hostname.indexOf('www.').should.be.eq(-1);
    hostname.indexOf('/').should.be.eq(-1);
  });
});
