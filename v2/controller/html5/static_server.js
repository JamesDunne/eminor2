var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs")
    port = process.argv[2] || 8888;

http.createServer(function(request, response) {

  var uri = url.parse(request.url).pathname
    , filename = path.join(process.cwd(), uri);
  var tmp = uri.lastIndexOf(".");
  var extension = uri.substring((tmp + 1));

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

      if (extension === 'html') response.writeHeader(200, {"Content-Type": 'text/html'});
      else if (extension === 'htm') response.writeHeader(200, {"Content-Type": 'text/html'});
      else if (extension === 'css') response.writeHeader(200, {"Content-Type": 'text/css'});
      else if (extension === 'js') response.writeHeader(200, {"Content-Type": 'text/javascript'});
      else if (extension === 'png') response.writeHeader(200, {"Content-Type": 'image/png'});
      else if (extension === 'jpg') response.writeHeader(200, {"Content-Type": 'image/jpg'});
      else if (extension === 'jpeg') response.writeHeader(200, {"Content-Type": 'image/jpeg'});

      //response.writeHead(200);
      //response.write(file, "binary");
      response.end(file);
    });
  });
}).listen(parseInt(port, 10));

console.log("Static file server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");
