"use strict";
const crossSpawn = require('cross-spawn')
const path = require('path');
const fs = require('fs');
const uuid = require('node-uuid');
const format = require('util').format;
const request = require('request');

const FORMATS = ['A3', 'A4', 'A5', 'Legal', 'Letter', 'Tabloid'];
const ORIENTATIONS = ['portrait', 'landscape'];
const marginRegExp = /^((\d)|(\d\.\d))+(in|cm|mm)$/;
const zoomRegExp = /^\d(\.\d{1,3})?$/;
const dataUrlRegex = /^data:([a-zA-Z0-9!#$%^&\*_\-\+{}\|'.`~]+\/[a-zA-Z0-9!#$%^&\*_\-\+{}\|'.`~]+)?(;[a-zA-Z0-9]+=[a-zA-Z0-9\-]+)*(;base64)?,/;

function writePDF(url, filename, _options) {

	const options = { // Default Options
		format: 'A4',
		orientation: 'portrait',
		margin: '1cm',
		zoom: 1,
		..._options
	}

	const isDataUrl = dataUrlRegex.exec(url);
	if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0 && !isDataUrl) {
		url = 'http://' + url;
	}

	// check options

	if(FORMATS.indexOf(options.format) === -1){
		throw format('Invalid format, the following are supported: %s', FORMATS.join(', '));
	}
	if(ORIENTATIONS.indexOf(options.orientation) === -1){
		throw format('Invalid orientation, the following are supported: %s', ORIENTATIONS.join(', '));
	}
	if(!marginRegExp.test(options.margin)){
		throw format('Invalid margin, the following formats are supported: 0cm, 1cm, 2cm, 1in, 13mm');
	}
	if(!zoomRegExp.test(options.zoom)){
		throw format('Invalid zoom, the following kind of formats are supported: 1, 0.5, 9.25, 0.105');
	}

	return new Promise((resolve, reject) => {

		if (!isDataUrl) {
			request.head(url, function (err, resp) {
				if (err) {
					throw format('Cannot get %s: %s', url, err.message);
				}
				if (!/2\d\d/.test(resp.statusCode)) {
					throw format('Cannot get %s: http status code %s', url, resp.statusCode);
				}
				if(!/text|html/.test(resp.headers['content-type'])){
					throw format(
						'Cannot get %s: returns content type %s. You must point html2pdf.it to HTML or TEXT content',
						url,
						resp.headers['content-type']
					)
				}
				resolve(runPhantom(url, filename, options))
			});
	
		} else {
			const mime = isDataUrl[1];
			if (!/text|html/.test(mime)) {
				throw format(
					'Cannot get %s: returns content type %s. You must point html2pdf.it to HTML or TEXT content',
					url,
					mime
				)
			}
			resolve(runPhantom(url, filename, options))
		}
	})
}


function runPhantom(url, filename, _options) {
	const tmpFile = filename //path.join(__dirname, '../tmp', uuid.v4() + '.pdf');
	const options = [
		'--web-security=no',
		'--ssl-protocol=any',
		path.join(__dirname, './rasterize.js'),
		url,
		tmpFile,
		JSON.stringify(_options)
	];
	
	const pdfExecutable = require('phantomjs-prebuilt').path;

	let output = ''
	return new Promise((resolve, reject) => {
		const pdfProcess = crossSpawn.spawn(pdfExecutable, options);
		pdfProcess.stdout.on('data', function (data) {
			console.log(data);
			output += data
		});
		pdfProcess.stderr.on('data', function (data) {
			console.error(data);
			output += data
		});
		pdfProcess.on('close', function (code) {
			if (code) {
				if(code===100){					
					reject(res.status(400).send(outputLog));
				}
				throw new Error('Wrong code: ' + code);
			} else {
				resolve(tmpFile);
			}
		});
	})
}

exports.writePDF = writePDF