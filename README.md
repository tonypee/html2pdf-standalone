![logo](http://html2pdf.it/favicon-32x32.png) [html2pdf.it](http://www.html2pdf.it)
===========
Based on html2pdf.it, but as a standalone node library (not a webservice). For usage in an existing application. 

----

Generate PDFs from any web-page. You need [Node.js](http://nodejs.org) to run it.

See it in action at: [html2pdf.it](http://www.html2pdf.it).

----

Install
-----------
```shell
npm install
```

Page breaks
-----------
You can use the CSS attribute:
```css
page-break-before: always;
```

Data URIs
---------
You can use data URIs like the following to generate PDFs for arbitrary HTML:
```html
data:text/html;encoding=utf-8,<h1>Hello</h1>
```

As described on [Wikipedia](https://en.wikipedia.org/wiki/Data_URI_scheme), the data URI should have the following format:
```
data:[<media type>][;base64],<data>
```

License
-------
MIT
