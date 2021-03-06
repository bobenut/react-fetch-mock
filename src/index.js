import pathToRegexp from 'path-to-regexp';
import { parseRequest, matchUrl, isNull, delay } from './util';
import Response from './response';

class FetchMock {
  constructor(required, options = {
    fetch: () => {},
    exclude: [],
    proxy: [],
    delay: 2000,  // ms
  }) {
    if ('object' !== typeof required) {
      throw new Error('There is no required defined.');
    }

    this.urls = [];
    this.raw = options.fetch;
    this.exclude = options.exclude || [];
    this.proxy = options.proxy || [];
    this.delayTime = options.delay;

    this.loadMocks = this.loadMocks.bind(this);
    this.loadMock = this.loadMock.bind(this);
    this.matchReqUrl = this.matchReqUrl.bind(this);
    this.isExclude = this.isExclude.bind(this);
    this.isProxied = this.isProxied.bind(this);
    this.fetch = this.fetch.bind(this);

    this.loadMocks(required);
  }

  loadMocks(required) {
    const __mocks__ = required.default || required;   // es6 import or amd
    let mocks = Object.keys(__mocks__);
    mocks.forEach(key => {
      this.loadMock(key, __mocks__[key]);
    });
  }

  loadMock(key, mock) {
    if ('object' !== typeof mock) {
      if ('function' === typeof mock) {
        var items = key.split(' ');
        var method = items.length === 2 ? items[0] : 'GET';
        var url = items.length === 2 ? items[1] : key;
        this.urls.push({
          method,
          url,
          func: mock,
        });
      }
      return;
    }
    const keys = Object.keys(mock);
    keys.map(key => {
      this.loadMock(key, mock[key]);
    });
  }

  matchReqUrl(request) {
    let insideParams;
    const filters = this.urls.filter(uri => {
      const obj = matchUrl(uri.url, request.url);
      if (obj.result && uri.method.toUpperCase() === request.method.toUpperCase()) {
        insideParams = obj.params;
        return true;
      }
      return false;
    });
    if (!filters || filters.length == 0) throw new Error(`No url ${request.url} is defined.`);
    request.urlparams = insideParams;
    return {
      request,
      mock: filters[0],
    };
  }

  isExclude(url) {
    for (let i = 0; i < this.exclude.length; i++) {
      const excludeUrl = this.exclude[i];
      if (excludeUrl === url || pathToRegexp(`${excludeUrl}`).exec(url) !== null) {
        return true;
      }
    }
    return false;
  }

  isProxied(url) {
    if (this.proxy.length === 0) return false;
    const proxied = this.proxy.filter(item => pathToRegexp(`${item.path}`).exec(url) !== null);
    if (proxied.length > 1) throw new Error(`${url} proxied has two proxies, you should specific only one`);

    return proxied[0];
  }

  proxied(url) {
    // get proxied info
    let matches, proxied;
    this.proxy.forEach(item => {
      const tmp = pathToRegexp(item.path).exec(url);
      if (tmp && tmp.length > 1) {
        matches = tmp;
        proxied = item;
        return false;
      }
    });

    return proxied.process ? proxied.process(proxied, matches) : `${proxied.target}/${matches[1]}`;
  }

  fetch(url, options = {}) {
    // using proxy
    if (this.isProxied(url)) {
      url = this.proxied(url);
    }

    // using raw fetch while match exclude
    if (this.isExclude(url)) {
      // using raw fetch
      return this.raw(url, options);
    }

    const { request, mock } = this.matchReqUrl(parseRequest(url, options));
    if ('function' !== typeof mock.func) {
      throw new Error('There is no url defined in __mocks__');
    }
    let obj = mock.func(request);

    if (isNull(obj)) {
      throw 'response data should not be undefined or null, it will be an object or an array at least';
    }

    // resolve prue data object
    if (isNull(obj.status)) {
      obj = {
        status: 200,
        data: obj,
        ok: true
      };
    }

    const response = new Response(obj);
    const delayTime = options.delay || this.delayTime || 0;
    return delay(delayTime).then(() => Promise.resolve(response));
  }
}

export default FetchMock;
export { default as Mock } from 'mockjs';
