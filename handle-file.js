let util = require('util');
let fs = require('fs');
let path = require('path');
let babel = require("@babel/core");

let reactMethods = ["render", "componentWillMount", "componentDidMount", "componentWillUnmount", "getDefaultProps", "getInitialState"];

const njPath = path;

// promisify
const fs_readfile = util.promisify(fs.readFile);
const fs_writefile = util.promisify(fs.writeFile);
const fs_exists = util.promisify(fs.existsSync);


module.exports = async (file, target) => {
  let targetExists = fs.existsSync(target);
  let data;
  if(!targetExists) {
    data = await fs_readfile("./template.json", "utf-8");
  } else {
    data = await fs_readfile(target, "utf-8");
  }
  data = JSON.parse(data);

  let source = await fs_readfile(file, "utf-8");

  babel.transformSync(source, {
    presets: ["@babel/preset-react"],
    plugins: [
      babelFunction(source, data)
    ]
  });
  data["file"] = path.basename(file);
  let lsiFile = file.replace(/.js$/, "-lsi.js");
  if (fs.existsSync(lsiFile)) {
    data["lsiFile"] = path.basename(lsiFile);
  }
  let lessFile = file.replace(/.js$/, ".less");
  if (fs.existsSync(lessFile)) {
    data["lessFile"] = path.basename(lessFile);
  }
  return fs_writefile(target, JSON.stringify(data, null, 2));
};


function babelFunction(source, data) {

  function isPrimitive(val) {
    return val == null || /^[sbn]/.test(typeof val);
  }

  function looksLike(a, b) {
    return (
      a &&
      b &&
      Object.keys(b).every(bKey => {
        const bVal = b[bKey];
        const aVal = a[bKey];
        if (typeof bVal === 'function') {
          return bVal(aVal)
        }
        return isPrimitive(bVal) ? bVal === aVal : looksLike(aVal, bVal)
      })
    )
  }

  function buildObjectName(path) {
    let names = [];
    if (path.object) {
      names = names.concat(buildObjectName(path.object))
    }
    if (path.property) {
      names = names.concat(buildObjectName(path.property))
    }
    if (looksLike(path, {type: "Identifier"}))
      names.push(path.name);
    return names;
  }

  function handleMixins(path) {
    const isMixins = looksLike(path, {
      node: {
        key: {
          name: "mixins"
        }
      }
    });
    if (!isMixins) return;
    data["mixins"] = path.node.value.elements.map(el => buildObjectName(el).join("."));
  }

  function handleStatics(path, source) {
    const isStatics = looksLike(path, {
      node: {
        key: {
          name: "statics"
        }
      }
    });
    if (!isStatics) return;
    data["statics"] = source.toString().substr(path.node.start, path.node.end - path.node.start);
  }

  function processPropTypes(path, propRef) {
    if (path.type === "MemberExpression") {
      propRef["type"] = path.property.name;
      propRef["description"] = propRef["description"] || {cs:"", en:""};
    } else if (path.type === "CallExpression") {
      let type = path.callee.property.name;
      let args = path.arguments;
      //handlePropTypesCall(path.callee.property.name, path.arguments);
      //console.log("call", type)
      if (type === "shape") {
        propRef["type"] = type;
        propRef["description"] = propRef["description"] || {cs:"", en:""};
        args[0].properties.forEach(propKey => {
          let argKey = propKey.key.name;
          propRef["args"] = propRef["args"] || {};
          propRef["args"][argKey] = propRef["args"][argKey] || {
            description: {cs:"", en:""}
          }
        })
      } else if (type === "oneOfType") {
        propRef["type"] = type;
        propRef["args"] = args[0].elements.map(propKey => propKey.property.name);
        propRef["description"] = propRef["description"] || {cs:"", en:""};
      } else {
        propRef["type"] = type;
        propRef["description"] = propRef["description"] || {cs:"", en:""};
      }
    }
  }

  function handlePropTypes(path) {
    const isPropTypes = looksLike(path, {
      node: {
        key: {
          name: "propTypes"
        }
      }
    });
    if (!isPropTypes) return;
    path.node.value.properties.forEach(prop => {
      let propName = prop.key.name;
      data["propTypes"][propName] = data["propTypes"][propName] || {};
      if (prop.value.property && prop.value.property.name === "isRequired") {
        processPropTypes(prop.value.object, data["propTypes"][propName])
      } else {
        processPropTypes(prop.value, data["propTypes"][propName])
      }
    });
    // data["propTypes"] = path.node.value.properties.map(node => node.key.name);
  }

  function handleName(path) {
    if (looksLike(path, {node: {init: {type: "CallExpression", callee: {name: "createReactClass"}}}})) {
      data["name"] = path.node.id.name;
    }
  }

  function handleInterface(path) {
    let methodName = path.node.key.name;
    if (methodName.match(/^[^_].*[^_]$/) && !reactMethods.includes(methodName)) {
      let returns = path.node.body.body.find(item => item.type === "ReturnStatement");
      data["interface"][methodName] = data["interface"][methodName] || {};
      data["interface"][methodName]["returnThis"] = returns && returns.argument.type === "ThisExpression";
      data["interface"][methodName]["params"] = data["interface"][methodName]["params"] || {};
      data["interface"][methodName]["description"] = data["interface"][methodName]["description"] || {cs:"", en:""};
      path.node.params.forEach(node => {
        let name = node.name;
        data["interface"][methodName]["params"][name] = data["interface"][methodName]["params"][name] || {}
        data["interface"][methodName]["params"][name]["description"] = data["interface"][methodName]["params"][name]["description"] || {cs:"", en:""}
      });
    }
  }

  return function (bbl) {
    return {
      name: "Hey there!",
      visitor: {
        VariableDeclarator(path) {
          handleName(path);
        },
        ObjectMethod(path) {
          handleInterface(path);
        },
        ObjectProperty(path) {
          handleMixins(path); // export mixins
          handleStatics(path, source);
          handlePropTypes(path);
        },
        ImportDeclaration(path) {
          let file = path.node.source.value;
          if(file.match(/^\./) && !(file.match(/.less$/)) && !(file.match(/-lsi.js$/))) {
            let dirname = njPath.dirname(file);
            let dirs = dirname.split('/');
            let module = dirs[dirs.length-1];
            if(!(module === "helpers" || module === "config")) {
              // skip less, lsi and helper files
              data["dependencies"][file] = data["dependencies"][file] || {};
            }
          }
        }
      }
    }
  }
}
