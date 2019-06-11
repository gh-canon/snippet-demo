"use strict";

const port = process.env.PORT || 80;
const path = require("path");
const compression = require('compression');
const express = require("express");
const expressHandlebars = require("express-handlebars");
const bodyParser = require("body-parser");
const app = express();
const minify = require('@node-minify/core');
const babelMinify = require('@node-minify/babel-minify');
const jsdir = path.join(__dirname, "public", "js");
const maxRetentionMilliseconds = 1e4;
const encodingAlphabet = "23456789CFGHJMPQRVWX";
const encoder = require("./modules/encoder.js")(encodingAlphabet);
const demoIdToken = `:demoId([${encodingAlphabet}]+\-[${encodingAlphabet}]+)`;
const demos = {};
let _demoId = 1337;

for (let jsFileName of ["snippet-editor", "console-dispatcher", "console-receiver"]) {
    minify({
        compressor: babelMinify,
        input: path.join(jsdir, `${jsFileName}.js`),
        output: path.join(jsdir, `${jsFileName}.babel.js`)
    });
}

app.engine("handlebars", expressHandlebars());

app.set("view engine", "handlebars");

app.use(compression());

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));

app.get(`/`, (req, res) => {

    const demoId = `${encoder.encode(new Date())}-${encoder.encode(++_demoId)}`;

    res.render("snippet-editor", {
        demoId: demoId
    });

});

app.get(`/snippet-host`, (req, res) => {

    const demoId = `${encoder.encode(new Date())}-${encoder.encode(++_demoId)}`;

    res.render("snippet-host", {
        renderPath: req.hostname === "localhost" ? "" : "https://snippetrender.canoncode.com",
        demoId: demoId
    });

});

app.post(`/snippet-host`, (req, res) => {    

    const demoId = req.body.demoId;    

    const demo = {};

    if (req.body.html) {
        demo.html = req.body.html;
    }

    if (req.body.css) {
        demo.css = req.body.css;
    }

    if (req.body.js) {
        demo.js = req.body.js;
    }

    demos[demoId] = demo;

    setTimeout(function () {
        delete demos[demoId];
    }, maxRetentionMilliseconds);
    
    res.render("snippet-host", {
        renderPath: req.hostname === "localhost" ? "" : "https://snippetrender.canoncode.com",
        demoId: demoId
    });

});

app.get(`/snippet-render/${demoIdToken}/js`, (req, res) => {

    const demoId = req.params.demoId;

    const demo = demos[demoId];       

    if (!demo || !demo.js) {
        res.status(404);
        return;
    }

    const js = demo.js;

    delete demo.js;

    res.set("Content-Type", "text/javascript");

    res.send(js);    

});

app.get(`/snippet-render/${demoIdToken}/css`, (req, res) => {

    const demoId = req.params.demoId;

    const demo = demos[demoId];

    if (!demo || !demo.css) {
        res.status(404);
        return;
    }

    const css = demo.css;

    delete demo.css;

    res.set("Content-Type", "text/css");

    res.send(css);   

});

app.get(`/snippet-render/${demoIdToken}`, (req, res) => {

    const demoId = req.params.demoId;

    const demo = demos[demoId];    

    if (!demo) {
        res.status(404);
        return;
    }

    res.render("snippet-render", {
        renderPath: req.hostname === "localhost" ? "" : "https://snippetrender.canoncode.com",
        demoId: demoId,
        html: demo.html,        
        hasJs: "js" in demo,
        hasCss: "css" in demo
    });

});

app.listen(port);