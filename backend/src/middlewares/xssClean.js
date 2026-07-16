import xssFilters from 'xss-filters';

function cleanValue(data = '') {
  let isObject = false;
  if (typeof data === 'object' && data !== null) {
    data = JSON.stringify(data);
    isObject = true;
  }

  if (typeof data === 'string') {
    data = xssFilters.inHTMLData(data).trim();
  }

  if (isObject) {
    try {
      data = JSON.parse(data);
    } catch (e) {
      // Bỏ qua các lỗi phân tích cú pháp
    }
  }

  return data;
}

export default function xssClean() {
  return (req, res, next) => {
    if (req.body) {
      req.body = cleanValue(req.body);
    }
    
    if (req.query) {
      const cleanedQuery = cleanValue(req.query);
      Object.defineProperty(req, 'query', {
        value: cleanedQuery,
        writable: true,
        configurable: true,
        enumerable: true
      });
    }

    if (req.params) {
      const cleanedParams = cleanValue(req.params);
      Object.defineProperty(req, 'params', {
        value: cleanedParams,
        writable: true,
        configurable: true,
        enumerable: true
      });
    }

    next();
  };
}
