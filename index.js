const express = require('express');
let path = require('path');
let fs = require('fs');
let bodyParser = require('body-parser');
var use_https = true;
const app = express();
const port = 80;
const port443 = 443;
var https = require('https');
//var privateKey  = fs.readFileSync('sslcert/ssl.key', 'utf8');
//var certificate = fs.readFileSync('sslcert/ssl.csr', 'utf8');
var privateKey  = fs.readFileSync('growingtek.com.tw/private.key', 'utf8');
var certificate = fs.readFileSync('growingtek.com.tw/certificate.crt', 'utf8');
var credentials = {key: privateKey, cert: certificate};
var httpsServer = https.createServer(credentials, app);

app.use(bodyParser.urlencoded({
	extended: true
  }));
app.use(bodyParser.json());
app.get('/', (req, res) => {
	  //res.send('Hello World!');
	res.sendFile(path.join(__dirname, "shintek.html"));
});
app.get('/css/multiColumnTemplate.css', function (req, res) {
	  let data = fs.readFileSync(path.join(__dirname, "css/multiColumnTemplate.css"));
	  res.setHeader('Content-type' , 'text/css');
	  res.end(data);
});
app.get('/images/placeholder.jpg', function (req, res) {
	  let data = fs.readFileSync(path.join(__dirname, "images/placeholder.jpg"));
	  res.setHeader('Content-type' , 'image/jpg');
	  res.end(data);
});
app.get('/images/img_aboutUs.jpg', function (req, res) {
	let data = fs.readFileSync(path.join(__dirname, "images/img_aboutUs.jpg"));
	res.setHeader('Content-type' , 'image/jpg');
	res.end(data);
});
app.get('/images/5G_1.jpg', function (req, res) {
	let data = fs.readFileSync(path.join(__dirname, "images/5G_1.jpg"));
	res.setHeader('Content-type' , 'image/jpg');
	res.end(data);
});
app.get('/images/img_website.jpg', function (req, res) {
	let data = fs.readFileSync(path.join(__dirname, "images/img_website.jpg"));
	res.setHeader('Content-type' , 'image/jpg');
	res.end(data);
});
app.get('/images/company1.jpg', function (req, res) {
	let data = fs.readFileSync(path.join(__dirname, "images/company1.jpg"));
	res.setHeader('Content-type' , 'image/jpg');
	res.end(data);
});
app.get('/images/hot1.jpg', function (req, res) {
	let data = fs.readFileSync(path.join(__dirname, "images/hot1.jpg"));
	res.setHeader('Content-type' , 'image/jpg');
	res.end(data);
});
app.get('/images/hot2.jpg', function (req, res) {
	let data = fs.readFileSync(path.join(__dirname, "images/hot2.jpg"));
	res.setHeader('Content-type' , 'image/jpg');
	res.end(data);
});
app.get('/images/hot3.jpg', function (req, res) {
	let data = fs.readFileSync(path.join(__dirname, "images/hot3.jpg"));
	res.setHeader('Content-type' , 'image/jpg');
	res.end(data);
});
app.get('/images/hot4.jpg', function (req, res) {
	let data = fs.readFileSync(path.join(__dirname, "images/hot4.jpg"));
	res.setHeader('Content-type' , 'image/jpg');
	res.end(data);
});
if(use_https){
const http = require('http');
// redirect HTTP server
const httpApp = express();
const httpServer = http.createServer(httpApp);
httpServer.listen(80, () => console.log(`HTTP server listening-2: http://localhost`));
httpApp.use((req, res, next) => {
	    if (req.protocol === 'http') {
		            return res.redirect(301, `https://${req.headers.host}${req.url}`);
		        }
		    
		            next();
		            });
httpsServer.listen(port443,() => {
		  console.log(`Example app listening at https://localhost:${port443}`);
	});
}
else{
app.listen(port, () => {
	  console.log(`Example app listening at http://localhost:${port}`);
});
}
