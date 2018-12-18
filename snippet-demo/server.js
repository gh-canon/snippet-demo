"use strict";

const port = process.env.PORT || 80;
const express = require("express");
const expressHandlebars = require("express-handlebars");
const bodyParser = require("body-parser");
const app = express();

app.engine("handlebars", expressHandlebars());

app.set("view engine", "handlebars");

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