var exec   = require('child_process').exec,
  fs       = require('fs-extra'),
  sanitize = require('sanitize-filename'),
  auth     = require('./auth')(),
  config   = require('../config'),
  loadDirectories = require('./loadDirectories'),
  router   = require('express').Router();

/* serve a snippet */
router.get('/snippet/:file', function (req, res) {
  // get the file contents
  var filePath = config.directories.snippets + sanitize(req.params.file);
  fs.readFile(filePath, 'utf8', function(err, data) {
    if (err) return res.status(404).end('could not retrieve snippet!');
    res.send(data);
  });
});

/* save a file & rescan the directories */
router.post('/save', auth, function(req, res) {
  var path = config.directories.documents;
  if (req.body.type === 'template') path = config.directories.templates;
  else if (req.body.type === 'snippet') path = config.directories.snippets;
  var fileName = sanitize(decodeURIComponent(req.body.name)).replace(/\s+/g, '_');

  fs.outputFile(path + fileName, req.body.markdown, function(err) {
    if (err) return res.status(500).end(err.message);

    loadDirectories(function(err, result) {
      if (err) return res.status(500).end(err.message);
      req.app.locals = result;
      res.json({ saved: config.baseURL + '/' + req.body.type + '/' + fileName });
    });
  });
});

/* convert the given file to pdf & send it as download
   sideeffect: the pdf file will reside in the documents directory */
router.get('/export/:format/:file', function(req, res) {

  var inPath = config.directories.documents + sanitize(req.params.file),
    expFormat = config.exportFormats[req.params.format],
    outPath = inPath.split('.');
  outPath.pop();
  outPath += expFormat.extension;
  var cmd = ['pandoc -o', outPath, inPath, expFormat.options].join(' ');
  fs.stat(inPath, function(err, inStat) {
    if (err) return res.status(500).end('input file not found');

    fs.stat(outPath, function(err, outStat) {
      // if outPath exists & is newer than the source file, send it
      if (!err && outStat.mtime > inStat.mtime) return res.download(outPath);
      // else generate the output file using pandoc & send it
      else {
        exec(cmd, function(err, stdout, stderr) {
          if (err) return res.status(500).send(stderr + stdout);
          res.download(outPath);
        });
      }
    });
  });
});

module.exports = router;