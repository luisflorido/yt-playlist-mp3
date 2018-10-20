var path = require('path');
var fs = require('fs');
var ytdl = require('youtube-dl');
var ffmpeg = require('ffmpeg');
var colors = require('colors/safe');

var videos = [];
var videoSiz = 0;
var converted = 0;

function playlist(url) {
  'use strict';
  var video = ytdl(url);

  video.on('error', function error(err) {
    console.log('error 2:', err);
  });

  var size = 0;
  video.on('info', function (info) {
    size = info.size;
    var filename = info._filename + '';
    filename = filename.split('.')[0];
    var output = path.join(__dirname + '/', size + '.mp4');
    videos.push({ "output": output, "mp3": path.join(__dirname + '/mp3/', filename + '.mp3').replace(/ /g, '') });
    video.pipe(fs.createWriteStream(output));
    console.log(colors.cyan('Arquivo criado: ' + filename));
  });

  var pos = 0;
  var milli = Date.now();
  video.on('data', function data(chunk) {
    pos += chunk.length;
    if (size) {
      var percent = (pos / size * 100).toFixed(2);
      process.stdout.cursorTo(0);
      process.stdout.clearLine(1);
      process.stdout.write(percent <= 33 ? colors.red(percent + '%') : (percent <= 66 ? colors.yellow(percent + '%') : colors.green(percent + '%')));
      if (percent == 100) {
        var fileName = videos[videoSiz];
        console.log(colors.green('\nArquivo baixado em ' + parseInt((Date.now() - milli) / 1000) + ' segundos.'));
        console.log(colors.yellow('Convertendo arquivo: ' + fileName["mp3"] + '\n'));

        try {
          var ff = new ffmpeg(fileName["output"]);
          ff.then(function (video) {
            video.fnExtractSoundToMP3(fileName["mp3"], function (error, file) {
              if (converted >= videos.length - 1) {
                console.log(colors.red('Removendo arquivos...'));
                fromDir(__dirname, /\.mp4$/, function (filename) {
                  fs.unlinkSync(filename);
                });
              }
              converted++;
            });
          }, function (err) {
            console.log('Error: ' + err);
          });
        } catch (e) {
          console.log(e.code);
          console.log(e.msg);
        }

        videoSiz++;
      }
    }
  });

  video.on('next', playlist);

}

function fromDir(startPath, filter, callback) {
  if (!fs.existsSync(startPath)) {
    console.log("no dir ", startPath);
    return;
  }

  var files = fs.readdirSync(startPath);
  for (var i = 0; i < files.length; i++) {
    var filename = path.join(startPath, files[i]);
    var stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
      fromDir(filename, filter, callback);
    }
    else if (filter.test(filename)) callback(filename);
  };
};

var args = process.argv;

if (args.length == 3) {
  var link = args[2];
  var linkReg = /https:\/\/www\.youtube\.com\/playlist\?list=[a-z0-9A-Z-]+/.test(link);
  if (linkReg) {
    console.log(colors.green("Iniciando..."));
    playlist(link);
  } else {
    console.log(colors.red("Link inválido!"));
    return;
  }
} else {
  console.log(colors.red("Parâmetros inválidos!\nUse node yt.js [LINK]"));
  return;
}