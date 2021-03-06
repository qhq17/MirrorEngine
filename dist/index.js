"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs = require("fs-extra");
const os = require("os");
const path = require("path");
const config_1 = require("./config");
const github_1 = require("./github");
const log_1 = require("./log");
const parser_1 = require("./parser");
const request_1 = require("./request");
const VERSION = "1.0.11";
const CONFIG_FILE_NAME = "mirror-engine-config.json";
const LOG_DIRECTORY_NAME = "mirror-engine-logs";
const SLEEP_RESOLUTION = 4;
const LogNameFormat = () => {
    return "v" + VERSION.replace(/\./g, "_") + "-" + Date.now() + ".txt";
};
process.on("uncaughtException", (err) => {
    const file = path.resolve(os.homedir(), LOG_DIRECTORY_NAME, "crash-" + LogNameFormat());
    const content = [];
    content.push("Node version: " + process.version);
    for (const arg of process.argv)
        content.push("Argument: " + arg);
    content.push(err.stack);
    content.push("");
    fs.appendFileSync(file, content.join("\n"), "utf8");
    throw err;
});
process.on("unhandledRejection", (reason) => {
    throw reason;
});
let Running = true;
const Shutdown = () => {
    if (!Running)
        return;
    log_1.LogMessage("Shutdown initiated");
    Running = false;
};
process.on("SIGHUP", Shutdown);
process.on("SIGTERM", Shutdown);
process.on("SIGINT", Shutdown);
const Sleep = (milliseconds) => {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
};
const SleepWhileRunning = async (seconds) => {
    assert(typeof seconds === "number");
    assert(!isNaN(seconds) && isFinite(seconds));
    assert(seconds === Math.round(seconds) && 64 < seconds && seconds < 65536);
    seconds *= SLEEP_RESOLUTION;
    while (Running && seconds-- > 0)
        await Sleep(Math.ceil(1000 / SLEEP_RESOLUTION));
};
const RequestRetryTimerGet = (timeout) => {
    return {
        Retry: true,
        Timer: {
            Timer: SleepWhileRunning,
            Timeout: timeout,
        },
    };
};
const LockfileParse = (data) => {
    const out = new Set();
    for (const line of config_1.ConfigTextToIterable(data)) {
        out.add(line);
        log_1.LogDebug("File locked: '" + line + "'");
    }
    return out;
};
const Main = async () => {
    const home = os.homedir();
    const file = path.resolve(home, CONFIG_FILE_NAME);
    let logs = path.resolve(home, LOG_DIRECTORY_NAME);
    await fs.mkdirp(logs);
    logs = path.resolve(logs, LogNameFormat());
    log_1.LogSetFile(logs);
    log_1.LogMessage("Logging to '" + logs + "'");
    const config = await config_1.ConfigLoad(file);
    const manifest = config.Manifest;
    log_1.LogDebug("Configuration data:");
    log_1.LogDebug(JSON.stringify(config, null, 2).replace(config.Secret, "<redacted>"));
    if (manifest.length === 0)
        throw new Error("Manifest Error: No entry found");
    else
        log_1.LogDebug("Manifest size: " + manifest.length);
    const requester = new request_1.RequestEngine();
    requester.HeadersCustomSet(request_1.RequestHeadersCustomizable.UserAgent, config.User);
    const comparator = new parser_1.ParserComparatorRaw();
    const resolver = new parser_1.ParserResolveInclude(manifest);
    const github = new github_1.GitHub(config.User, config.Secret, comparator);
    let i = manifest.length;
    while (Running) {
        if (i === manifest.length) {
            i = 0;
            config_1.ConfigManifestShuffle(manifest);
            log_1.LogDebug("Manifest shuffled:");
            log_1.LogDebug(JSON.stringify(manifest, null, 2));
        }
        const lockfile = await requester.Get(config.Lockfile, RequestRetryTimerGet(30 * config.TimerScale));
        if (typeof lockfile.Text === "undefined") {
            log_1.LogError("Lockfile Error: Network error");
            await SleepWhileRunning(60 * 60 * config.TimerScale);
            continue;
        }
        const lock = LockfileParse(lockfile.Text);
        const entry = manifest[i];
        if (lock.has(entry.Name)) {
            log_1.LogWarning("Update Skipped: File locked");
            i++;
            await SleepWhileRunning(5 * 60 * config.TimerScale);
            continue;
        }
        const data = await requester.Get(entry.Link, RequestRetryTimerGet(30 * config.TimerScale));
        if (typeof data.Text === "string" && parser_1.ParserValidateRaw(data.Text)) {
            const payload = {
                Repo: config.Repo,
                Path: "raw/" + entry.Name,
                Content: resolver.Resolve(entry, data.Text),
                Message: "Automatic mirror update - Mirror Engine v" + VERSION,
            };
            const response = await github.FileUpdate(payload);
            if (response.Success)
                log_1.LogMessage("Updated '" + entry.Name + "' successfully");
            else
                log_1.LogError("Update Error: Could not update '" + entry.Name + "'");
        }
        else {
            log_1.LogError("Update Error: Could not download '" + entry.Name + "'");
        }
        i++;
        await SleepWhileRunning(15 * 60 * config.TimerScale);
    }
    log_1.LogDebug("Shutdown completed");
};
Main();
