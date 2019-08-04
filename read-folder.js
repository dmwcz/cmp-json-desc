let util = require("util");
let fs = require('fs');
let path = require('path');
let handler = require("./handle-file.js");
let readFolder = require("./helpers/read-folder.js");
let asyncForEach = require("./helpers/async-foreach.js");

const from = 'C:\\projects\\uu\\uaf\\uu_jokesg01-uu5\\uu_jokes_maing01-client\\src';
const target = 'C:\\projects\\uu\\uaf\\uu_jokesg01-uu5\\uu_jokes_main-design\\client';

const start = async () => {
  let files = await readFolder(from);
  files = files.filter(file => {
    return (
      (path.extname(file) === ".js")
      &&
      !(path.basename(file) === "config.js")
      &&
      !(path.basename(file).match(/-lsi.js$/))
    )
  }).filter(file => {
    let dir = path.dirname(file);
    let dirs = dir.split('\\');
    let module = dirs[dirs.length - 1];
    // create folders
    let keep = !(module === "helpers" || module === "config" || module === "src");
    if (keep) {
      let targetFolder = dir.replace(from, target);
      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder);
      }
    }
    return keep;
  });
  // files = [
  //   'C:\\projects\\uu\\uaf\\ucl_goodymatg01-nodejs\\ucl_goodymatg01_main-client\\src\\backoffice-shop-locker\\loader.js'
  // ];
  await asyncForEach(files, async (file) => {
    try {
      let hello = await handler(file, file.replace(from, target) + "on");
    } catch (e) {
      console.log(file);
      console.error(e);
      throw e;
    }
    console.log(file);
  });
};


start().then(() => console.log("done"));