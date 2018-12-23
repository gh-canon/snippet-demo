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

app.get("/", (req, res) => {
    res.render("snippet-editor");
});

app.get("/sample", (req, res) => {
    res.render("snippet-editor-sample");
});

app.get("/snippet-host", (req, res) => {
    res.render("snippet-host");
});

app.post("/snippet-host", (req, res) => {    
    res.render("snippet-host", {
        renderPath: req.hostname === "localhost" ? "" : "https://snippetrender.canoncode.com",
        html: Buffer.from(req.body.html || "").toString("base64"),
        js: Buffer.from(req.body.js || "").toString("base64"),
        css: Buffer.from(req.body.css || "").toString("base64")
    });
});

app.post("/snippet-render", (req, res) => {
    res.render("snippet-render", {
        html: Buffer.from(req.body.html, "base64").toString(),
        js: Buffer.from(req.body.js, "base64").toString(),
        css: Buffer.from(req.body.css, "base64").toString()
    });
});

app.listen(port);