/** 
 * Danimator's Node server for managing local files
 * The editor's Danimator.save() method sends its data to this server for local saving of changes.
 **/

 // ###TODOS:
 // o send JSON responses
 // o validate preflight request

const http  		= require('http');
const url   		= require('url');
const fs    		= require('fs');
const md5 			= require('md5');
const debug 		= require('cli-color');

const baseDirectory = '../../';

let statusCode 	= 200;
let status 			= debug.red('No payload received.');

function _success(msg) {
	statusCode = 200;
	status = msg;
	console.log(debug.green(msg));
}
function _fail(msg) {
	statusCode = 400;
	status = msg;
	console.error(debug.red(msg));
}

http.createServer((req, res) => {

  const _url = url.parse(req.url);
  const path = _url.pathname;
  
  let body = [];

  if(path == "/save") {

    req.on('data', data => {
    	body.push(data);
    	console.log(debug.yellow('Receiving data …'));
    });

    req.on('end', () => {
    	body = Buffer.concat(body).toString();

    	if(body) {
    		var directive = JSON.parse(body);
    		var state = md5(body);

    		if(directive.file) {
    			fs.writeFileSync(`${baseDirectory}${directive.file}`, directive.content);
    			_success(`Saved ${directive.file} – ${state}`);
    		} else _fail('No filename supplied.');
    	} else {
        _success('Preflight allowed.');
      }

    	res.writeHead(statusCode, {
  		  'Content-Type': 'application/json; charset=utf-8',
  		  'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
  		  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
		  });
		  res.end(status);
    });
  }

}).listen(8080);

console.log('Danimator server up and running.');