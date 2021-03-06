"use strict;"

// import { Promise } from 'es6-promise';
import { Map } from 'immutable';
import urljoin from 'url-join';

const RE_EXT = /^.*\.(.*)$/;
const RE_LEFT_SLASH = /^\/+/;
const RE_RIGHT_SLASH = /\/+$/;

function getExtension(f) {
    f = typeof(f) === 'string' ? f : f.name;
    var m = f.match(RE_EXT);
    return m ? m[1].toLowerCase() : null;
}

function getName(f) {
  if (typeof(f) !== 'string')
      f = f.name;
  var parts = f.split('/');
  return parts[parts.length - 1];
}

function arrayStringContains(el, arr) {
  console.log(el);
  console.log(typeof(el));
  if (typeof(el) === 'undefined' || el === null || el.length === 0)
    return false;
  el = el.toLowerCase();
  for (var i=0; i<arr.length; ++i) {
    // console.log(i)
    if (el === arr[i].toLowerCase())
      return true;
  }
}

function combineServerPath(server, path) {
  server = server.replace(RE_RIGHT_SLASH, '');
  path = path.replace(RE_LEFT_SLASH, '');
  return server + '/' + path;
}

function getPrefix(connection) {
  switch (connection.get('type')) {
    case 'HTTP':
      return connection.get('location');
    case 'SSHBridge':
      // return connection.get('localHTTPServer') + '/' + '?user=' + connection.get('username') + '&server=' + connection.get('remoteSSHServer') + '&path=';
      return connection.get('localHTTPServer');
    default:
      throw 'Connection type not recognized: ' + connection.get('type');
  }
}

function getURL(path, connection) {
  console.log(connection)
  console.log(path)
  console.log(urljoin(getPrefix(connection), path));

  return urljoin(getPrefix(connection), path);
}



// function getRequiresCredentials(settings, connection) {
//   switch (connection) {
//     case 'remoteHTTP':
//       return settings.servers.remoteHTTP.requiresCredentials;
//     case 'localHTTP':
//     case 'SSHBridge':
//       return false;
//   }
// }

function httpGet(path, connection=Map(), opts={}) {
  return new Promise((resolve, reject) => {
    console.log(path);
    if (path === undefined)
      reject('No path provided');
    var url = connection.get('type') ? getURL(path, connection) : path;
    console.log(connection.get('type'));
    if (connection.get('type'))
      console.log(getURL(path, connection));
    var request = new XMLHttpRequest();
    console.log('url')
    console.log(url)
    request.open('GET', url);
    request.withCredentials = connection.get('requiresCredentials', false);
    if ('range' in opts)
      request.setRequestHeader('Range', 'bytes=' + opts.range.min + '-' + opts.range.max);
    if ('contentType' in opts)
      request.setRequestHeader('Content-Type', opts.contentType);
    request.onload = () => {
      console.log(request)
      if (request.status >= 200 && request.status < 400) {
        console.log('found somethign at path: ' + path);
        resolve(request.responseText);
      } else {
        // We reached our target server, but it returned an error
        if (connection.isEmpty())
          reject('The path: ' + path + ' does not exist');
        else
          reject('The path: ' + path + ' does not exist with connection: ' + JSON.stringify(connection, null, 2));
      }
    }
    
    // Handle network errors
    request.onerror = () => {
      reject("Network Error")
    }

    request.send();
  });
}

function localTextGet(file) {
  return new Promise((resolve, reject) => {
    console.log('in localTextGet: ');
    console.log(file);
    var reader = new FileReader();
    reader.onload = () => { 
      console.log(reader.result)
      resolve(reader.result);
    }
    reader.onerror = () => {
      reject(reader.error);
    }
    reader.readAsText(file)
  })
}


// function httpExists(path, connection) {
//   // if (typeof(credentials) === 'undefined')
//   //   credentials = false;
//   var exists;
//   var request = new XMLHttpRequest();
//   // var url = getURL(path, connection);
//   request.open('GET', path, false);
//   request.setRequestHeader('Range', 'bytes=0-1');
//   request.withCredentials = connection.get('requiresCredentials') || false;
//   request.onload = () => {
//     if (request.status >= 200 && request.status < 400) {
//       // Success!
//       console.log('it exists');
//       exists = true;
//     } else {
//       // We reached our target server, but it returned an error
//       console.log('it does not exist');
//       exists = false;
//     }
//   }
//   request.send();
//   return exists;
// }

function sshExists(path, connection) {
  // if (typeof(credentials) === 'undefined')
  //   credentials = false;
  var exists;
  var request = new XMLHttpRequest();
  path += '&lchr=1&lmin=2&lmax=3';
  request.open('GET', path);
  request.onload = () => {
    if (request.status >= 200 && request.status < 400) {
      // Success!
      console.log('it exists');
      exists = true;
    } else {
      // We reached our target server, but it returned an error
      console.log('it does not exist');
      exists = false;
    }
  }
  request.send();
  return exists;
}

var deepExtend = function(out) {
  out = out || {};

  for (var i = 1; i < arguments.length; i++) {
    var obj = arguments[i];

    if (!obj)
      continue;

    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'object')
          deepExtend(out[key], obj[key]);
        else
          out[key] = obj[key];
      }
    }
  }

  return out;
};


// function UID() {
//     this.ID = 0;
// }

// UID.prototype.next = function() {
//     this.ID++;
//     return this.ID;    
// }

class UID {
  constructor() {
    this.ID = 0
  }

  next() {
    this.ID++;
    return this.ID;
  }
}

const cleanHash = (url) => {
  return url.replace(new RegExp('#', 'g'), '%23');
}


module.exports = {
  getName: getName,
  getExtension: getExtension,
  UID: UID,
  arrayStringContains: arrayStringContains,
  combineServerPath: combineServerPath,
  // httpExists: httpExists,
  getURL: getURL,
  // getRequiresCredentials: getRequiresCredentials,
  httpGet: httpGet,
  localTextGet: localTextGet,
  deepExtend: deepExtend,
  cleanHash: cleanHash,
}