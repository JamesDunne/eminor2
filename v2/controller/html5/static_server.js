var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs")
    port = process.argv[2] || 8888;

http.createServer(function(request, response) {
  var uri = url.parse(request.url).pathname
    , filename = path.join(process.cwd(), uri);
  var tmp = uri.lastIndexOf(".");
  var extension = null;
  if (tmp >= 0) extension = uri.substring((tmp + 1));

  fs.exists(filename, function(exists) {
    if(!exists) {
      response.writeHead(404, {"Content-Type": "text/plain"});
      response.write("404 Not Found\n");
      response.end();
      return;
    }

    if (fs.statSync(filename).isDirectory()) filename += '/index.html';

    fs.readFile(filename, "binary", function(err, file) {
      if(err) {
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write(err + "\n");
        response.end();
        return;
      }

      if (extension === null || extension === 'html') response.writeHead(200, {"Content-Type": 'text/html'});
      else if (extension === 'htm') response.writeHead(200, {"Content-Type": 'text/html'});
      else if (extension === 'css') response.writeHead(200, {"Content-Type": 'text/css'});
      else if (extension === 'js') response.writeHead(200, {"Content-Type": 'text/javascript'});
      else if (extension === 'png') response.writeHead(200, {"Content-Type": 'image/png'});
      else if (extension === 'jpg') response.writeHead(200, {"Content-Type": 'image/jpeg'});
      else if (extension === 'jpeg') response.writeHead(200, {"Content-Type": 'image/jpeg'});
      else response.writeHead(200, {"Content-Type": 'application/octet-stream'});

      response.write(file, "binary");
      response.end();
      //response.end(file);
    });
  });
}).listen(parseInt(port, 10), "0.0.0.0");

console.log("Static file server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");
