var page = require('webpage').create();
var system = require('system');

var address = system.args[1];
var output = system.args[2];
var options = JSON.parse(system.args[3]);

page.viewportSize = { width: 800, height: 800 };

var size = options.format.split('*');
page.paperSize =
	size.length === 2 ?
	{ width: size[0], 
		height: size[1], 
		orientation: options.orientation, 
		margin: options.orientation 
	} :
	{ format: options.format, 
		orientation: options.orientation, 
		margin: options.margin 
	};
	page.zoomFactor = Number(options.zoom);
var statusCode;

page.onResourceReceived = function (resource) {
	if (resource.url === address) {
		statusCode = resource.status;
	}
};
page.open(address, function (status) {

	console.log('open');
	if (status !== 'success') {
		console.error('Unable to load the address (' + statusCode + '): ' + address, status);
		return phantom.exit(100);
	} else {
		if (page.evaluate(function () {
			return typeof html2pdf === 'object';
		})) {
			var paperSize = page.paperSize;
			setUpHeaderOrFooter('header');
			setUpHeaderOrFooter('footer');
			page.paperSize = paperSize;
		}
		return window.setTimeout(function () {
			page.render(output, {format: 'pdf'});
			phantom.exit();
		}, 1000);
	}

	function setUpHeaderOrFooter(headerOrFooter) {
		var hasHeaderOrFooter = page.evaluate(function (headerOrFooter) {
			return typeof html2pdf[headerOrFooter] === 'object';
		}, headerOrFooter);
		if (hasHeaderOrFooter) {
			var height, contents;
			var typeOfHeight = page.evaluate(function (headerOrFooter) {
				return html2pdf[headerOrFooter].height && typeof html2pdf[headerOrFooter].height;
			}, headerOrFooter);
			if (typeOfHeight === 'string') {
				height = page.evaluate(function (headerOrFooter) {
					return html2pdf[headerOrFooter].height;
				}, headerOrFooter);
			} else {
				console.error('html2pdf.' + headerOrFooter + '.height has wrong type: ' + typeOfHeight);
				return phantom.exit(100);
			}
			var typeOfContent = page.evaluate(function (headerOrFooter) {
				return html2pdf[headerOrFooter].contents && typeof html2pdf[headerOrFooter].contents;
			}, headerOrFooter);
			if (typeOfContent === 'string' || typeOfContent === 'function') {
				contents = phantom.callback(function (pageNum, numPages) {
					return getHtmlWithStyles(headerOrFooter, pageNum, numPages);
				});
			} else {
				console.error('html2pdf.' + headerOrFooter + '.contents has wrong type: ' + typeOfContent);
				return phantom.exit(100);
			}
			paperSize[headerOrFooter] = {
				height: height,
				contents: contents
			};
			return null;
		}
	}

	function getHtmlWithStyles(headerOrFooter, pageNumber, totalPages) {
		return page.evaluate(function (headerOrFooter, pageNumber, totalPages) {
			var contents = html2pdf[headerOrFooter].contents;
			var html = typeof contents === 'string' ?
				contents :
				html2pdf[headerOrFooter].contents(pageNumber, totalPages);
			html = html
				.replace(/\{\{pagenumber\}\}/gi, pageNumber)
				.replace(/\{\{totalpages\}\}/gi, totalPages);

			//Style/footer/Header super-container
			var superHost = document.createElement('div');
			superHost.innerHTML = html;

			// Styles will be placed before this element. First styles, then foorter/header elements
			var stylesGoesBefore = superHost.firstChild;

			var addStyle = function (styleStr) {
				var newStyle = document.createElement('style');
				newStyle.setAttribute('type', 'text/css');
				newStyle.innerHTML = styleStr;
				stylesGoesBefore.insertBefore( newStyle );
			};

			// https://developer.mozilla.org/en-US/docs/Web/API/document.styleSheets
			// https://developer.mozilla.org/en-US/docs/Web/API/StyleSheet.ownerNode
			for (var i = 0; i < document.styleSheets.length; i++) {
				var styleSheet = document.styleSheets[i];

				// CSS from style html element
				if (styleSheet.ownerNode.nodeName.toLowerCase() === 'style') {
					var cssStr = styleSheet.ownerNode.innerHTML;
					addStyle( cssStr );

				// CSS from link html element
				} else if (styleSheet.ownerNode.nodeName.toLowerCase() === 'link') {
					var xhReq = new XMLHttpRequest();
					xhReq.open('GET', styleSheet.href, false);
					xhReq.send(null);
					var serverResponse = xhReq.responseText;
					addStyle( serverResponse );
				}
			}

			return superHost.outerHTML;
		}, headerOrFooter, pageNumber, totalPages);
	}
});
