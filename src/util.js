'use strict';

const Util = {
  extractHostname
};

function extractHostname (url) {
  let hostname = '';

  if (url.indexOf('http') > -1) {
    hostname = url.split('://')[1];
  }

  if (hostname.indexOf('www') > -1) {
    hostname = hostname.split('w.')[1];
  }

  if (hostname.indexOf('/') > -1) {
    hostname = hostname.split('/')[0];
  }

  return hostname;
}

module.exports = function Factory () {
  return Object.assign({}, Util);
};
