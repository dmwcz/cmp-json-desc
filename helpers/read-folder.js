let util = require("util");
let fs = require('fs');
let path = require('path');

// promisify
const fs_readdir = util.promisify(fs.readdir);
const fs_stat = util.promisify(fs.stat);

/**
 *
 * @param dir
 * @param opt
 * @returns {Promise<Array>}
 */
let readFolder = async function(dir, opt = {recursive: true}) {
  let results = [];
  let list = await fs_readdir(dir);
  for(let file of list) {
    file = path.resolve(dir, file);
    let stat = await fs_stat(file);
    if (stat && stat.isDirectory()) {
      if(opt.recursive) {
        let innerFiles = await readFolder(file);
        results = results.concat(innerFiles);
      }
    } else {
      results.push(file);
    }
  }
  return results;
};

module.exports = readFolder;