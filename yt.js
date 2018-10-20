var path = require('path');
var fs = require('fs');
var ytdl = require('youtube-dl');
var ffmpeg = require('ffmpeg');
var colors = require('colors/safe');

const maxSize = 20;

var videos = [];
var videoSiz = 0;

function playlist(url) {
  'use strict';
  var video = ytdl(url);

  video.on('error', function error(err) {
    console.log(`Erro ${err}`);
  });

  var size = 0;
  video.on('info', function (info) {
    size = info.size;
    if ((size / 1000000) <= maxSize) {
      var filename = info._filename + '';
      filename = filename.split('.')[0];
      var output = path.join(__dirname + '/', size + '.mp4');
      videos.push({ "output": output, "mp3": path.join(__dirname + '/mp3/', filename.match(/[a-z0-9A-Z]+/g).join('_') + '.mp3') });
      video.pipe(fs.createWriteStream(output));
      console.log(colors.cyan('Arquivo criado: ' + filename));
    } else {
      console.log(colors.red(`Tamanho do video muito grande! Próximo...`));
      video.on('next', playlist);
    }
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
        console.log(colors.green('\nArquivo baixado em ' + parseInt((Date.now() - milli) / 1000) + ' segundos.'));
      }
    }
  });

  video.on('end', function () {
    var atual = videos[videoSiz];
    console.log(colors.yellow('Convertendo arquivo: ' + atual["mp3"] + '\n'));
    try {
      var ff = new ffmpeg(atual["output"]);
      ff.then(function (video) {
        videoSiz++;
        video.fnExtractSoundToMP3(atual["mp3"], function (error, file) {
          if (error) {
            console.log(colors.red('Erro ao converter arquivo!'));
            console.log(error);
            return;
          }
          for (let i in videos) {
            if (videos[i]["mp3"] == file + '') {
              setTimeout(function () {
                fs.unlinkSync(videos[i]["output"]);
              }, 2000);
            }
          }
        });
      }, function (err) {
        console.log('Error: ' + err);
      });
    } catch (e) {
      console.log(e.code);
      console.log(e.msg);
    }
  });

  video.on('next', playlist);
}

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