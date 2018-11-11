// --------------------------------------------------------------------------------------------- //

// MIT License
//
// Copyright (c) 2018 Hugo Xu
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

// --------------------------------------------------------------------------------------------- //

// Logging utility test

// --------------------------------------------------------------------------------------------- //

"use strict";

// --------------------------------------------------------------------------------------------- //

const os = require("os");
const path = require("path");

const { LogMessage, LogWarning, LogError, LogSetFile } = require("../dist/log");

// --------------------------------------------------------------------------------------------- //

process.on("unhandledRejection", (err) => {
    throw err;
});

// --------------------------------------------------------------------------------------------- //

const Log = (msg) => {
    console.log(msg);
};

const RandomId = () => {
    const hex = Math.random().toString(16);
    return hex.substring(2);
};

// --------------------------------------------------------------------------------------------- //

const TestAll = (msg) => {
    LogMessage(msg);
    LogWarning(msg);
    LogError(msg);
};

// --------------------------------------------------------------------------------------------- //

const TestMain = () => {

    // ----------------------------------------------------------------------------------------- //

    Log("Test 0: Empty message");
    TestAll("");
    Log("Test 0: Ended, no message should be logged");

    Log("");

    // ----------------------------------------------------------------------------------------- //

    Log("Test 1: Single-line message");
    TestAll("Test");
    Log("Test 1: Ended, three single-line messages should be logged");

    Log("");

    // ----------------------------------------------------------------------------------------- //

    Log("Test 2: Multi-line message");
    TestAll([
        "Test",
        "    Test",
    ].join("\n"));
    Log("Test 2: Ended, three multi-line messages should be logged, spaces should be conserved");

    Log("");

    // ----------------------------------------------------------------------------------------- //

    const file = path.resolve(os.tmpdir(), RandomId() + ".txt");

    // ----------------------------------------------------------------------------------------- //

    Log("Test 3: Set log path");
    LogSetFile(file);
    Log("Test 3: Ended, log path set to '" + file + "'");

    Log("");

    // ----------------------------------------------------------------------------------------- //

    Log("Test 4: Write log to file");
    TestAll("Test");
    Log(
        "Test 4: Ended, three single-line messages should be logged into the temporary file " +
        "instead of the console",
    );

    // ----------------------------------------------------------------------------------------- //

};

TestMain();

// --------------------------------------------------------------------------------------------- //