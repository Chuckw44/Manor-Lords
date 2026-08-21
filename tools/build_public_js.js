// Manor Lords public JS builder
// Runs with Windows Script Host: cscript.exe //nologo tools\build_public_js.js
// No Node, npm, Python, or Git installation required.

(function () {
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var shell = new ActiveXObject("WScript.Shell");

    function readUtf8(path) {
        var s = new ActiveXObject("ADODB.Stream");
        s.Type = 2;              // text
        s.Charset = "utf-8";
        s.Open();
        s.LoadFromFile(path);
        var text = s.ReadText();
        s.Close();
        return text;
    }

    function writeUtf8NoBom(path, text) {
        // Write UTF-8 text, then strip the UTF-8 BOM so the result is a normal JS file.
        var textStream = new ActiveXObject("ADODB.Stream");
        textStream.Type = 2;
        textStream.Charset = "utf-8";
        textStream.Open();
        textStream.WriteText(text);
        textStream.Position = 0;
        textStream.Type = 1;     // binary
        textStream.Position = 3; // skip UTF-8 BOM

        var binary = new ActiveXObject("ADODB.Stream");
        binary.Type = 1;
        binary.Open();
        textStream.CopyTo(binary);
        binary.SaveToFile(path, 2); // overwrite
        binary.Close();
        textStream.Close();
    }

    function isWordChar(ch) {
        return /[A-Za-z0-9_$]/.test(ch);
    }

    // Remove a named top-level-style property anywhere in the data object without
    // evaluating the private source. Property names in PUBLIC_STRIP_FIELDS must be
    // unique in game-data.dev.js. The scanner ignores strings and comments and can
    // remove object/array/scalar values safely, including a last property in an object.
    function stripNamedProperty(source, propertyName) {
        var i = 0;

        function isIdentChar(ch) {
            return /[A-Za-z0-9_$]/.test(ch);
        }

        while (i < source.length) {
            var ch = source.charAt(i);
            var next = i + 1 < source.length ? source.charAt(i + 1) : "";

            // Skip quoted strings/template literals.
            if (ch === '"' || ch === "'" || ch === "`") {
                var q = ch;
                var esc = false;
                i++;
                while (i < source.length) {
                    ch = source.charAt(i);
                    if (esc) esc = false;
                    else if (ch === "\\") esc = true;
                    else if (ch === q) { i++; break; }
                    i++;
                }
                continue;
            }

            // Skip comments.
            if (ch === "/" && next === "/") {
                i += 2;
                while (i < source.length && source.charAt(i) !== "\n" && source.charAt(i) !== "\r") i++;
                continue;
            }
            if (ch === "/" && next === "*") {
                i += 2;
                while (i + 1 < source.length && !(source.charAt(i) === "*" && source.charAt(i + 1) === "/")) i++;
                i += 2;
                continue;
            }

            // Match an unquoted identifier property followed by a colon.
            if (source.substr(i, propertyName.length) === propertyName &&
                (i === 0 || !isIdentChar(source.charAt(i - 1))) &&
                (i + propertyName.length >= source.length || !isIdentChar(source.charAt(i + propertyName.length)))) {

                var keyStart = i;
                var p = i + propertyName.length;
                while (p < source.length && /\s/.test(source.charAt(p))) p++;
                if (source.charAt(p) !== ":") { i += propertyName.length; continue; }

                var valueStart = p + 1;
                var k = valueStart;
                var braces = 0, brackets = 0, parens = 0;
                var quote = "", escaped = false;
                var lineComment = false, blockComment = false;

                while (k < source.length) {
                    ch = source.charAt(k);
                    next = k + 1 < source.length ? source.charAt(k + 1) : "";

                    if (lineComment) {
                        if (ch === "\n" || ch === "\r") lineComment = false;
                        k++;
                        continue;
                    }
                    if (blockComment) {
                        if (ch === "*" && next === "/") { blockComment = false; k += 2; }
                        else k++;
                        continue;
                    }
                    if (quote !== "") {
                        if (escaped) escaped = false;
                        else if (ch === "\\") escaped = true;
                        else if (ch === quote) quote = "";
                        k++;
                        continue;
                    }
                    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; k++; continue; }
                    if (ch === "/" && next === "/") { lineComment = true; k += 2; continue; }
                    if (ch === "/" && next === "*") { blockComment = true; k += 2; continue; }

                    if (ch === "{") braces++;
                    else if (ch === "}") {
                        if (braces > 0) braces--;
                        else if (brackets === 0 && parens === 0) {
                            // Last property in this object. Remove the comma before it.
                            var before = keyStart - 1;
                            while (before >= 0 && /\s/.test(source.charAt(before))) before--;
                            if (source.charAt(before) === ",") keyStart = before;
                            return source.substring(0, keyStart) + source.substring(k);
                        }
                    }
                    else if (ch === "[") brackets++;
                    else if (ch === "]" && brackets > 0) brackets--;
                    else if (ch === "(") parens++;
                    else if (ch === ")" && parens > 0) parens--;
                    else if (ch === "," && braces === 0 && brackets === 0 && parens === 0) {
                        // Property followed by another property. Remove through this comma.
                        return source.substring(0, keyStart) + source.substring(k + 1);
                    }
                    k++;
                }

                throw new Error("Could not determine end of private property: " + propertyName);
            }

            i++;
        }

        throw new Error("Expected private-only property was not found: " + propertyName);
    }

    function sanitizePublicSource(source) {
        // These fields document research provenance/testing and are intentionally
        // retained in private/game-data.dev.js but must never ship to the browser.
        var PUBLIC_STRIP_FIELDS = [
            "observedTests",
            "huntingHoundStatus",
            "huntingOutputStatus",
            "orchardMaturationExamples"
        ];

        var clean = source;
        var n;
        for (n = 0; n < PUBLIC_STRIP_FIELDS.length; n++) {
            clean = stripNamedProperty(clean, PUBLIC_STRIP_FIELDS[n]);
        }
        return clean;
    }

    function minify(source) {
        var out = "";
        var i = 0;
        var quote = "";
        var escaped = false;
        var pendingSpace = false;

        while (i < source.length) {
            var ch = source.charAt(i);
            var next = i + 1 < source.length ? source.charAt(i + 1) : "";

            if (quote !== "") {
                out += ch;
                if (escaped) {
                    escaped = false;
                } else if (ch === "\\") {
                    escaped = true;
                } else if (ch === quote) {
                    quote = "";
                }
                i++;
                continue;
            }

            if (ch === '"' || ch === "'" || ch === "`") {
                if (pendingSpace && out.length && isWordChar(out.charAt(out.length - 1))) {
                    // A quoted string cannot merge with an identifier without punctuation,
                    // but retain a separator when needed for conservative parsing.
                    out += " ";
                }
                pendingSpace = false;
                quote = ch;
                out += ch;
                i++;
                continue;
            }

            // Line comment.
            if (ch === "/" && next === "/") {
                i += 2;
                while (i < source.length && source.charAt(i) !== "\n" && source.charAt(i) !== "\r") i++;
                pendingSpace = true;
                continue;
            }

            // Block comment.
            if (ch === "/" && next === "*") {
                i += 2;
                while (i + 1 < source.length &&
                       !(source.charAt(i) === "*" && source.charAt(i + 1) === "/")) i++;
                i += 2;
                pendingSpace = true;
                continue;
            }

            if (/\s/.test(ch)) {
                pendingSpace = true;
                i++;
                continue;
            }

            if (pendingSpace) {
                if (out.length && isWordChar(out.charAt(out.length - 1)) && isWordChar(ch)) {
                    out += " ";
                }
                pendingSpace = false;
            }

            out += ch;
            i++;
        }

        return out;
    }

    var scriptPath = WScript.ScriptFullName;
    var toolsDir = fso.GetParentFolderName(scriptPath);
    var repoRoot = fso.GetParentFolderName(toolsDir);
    var sourcePath = fso.BuildPath(repoRoot, "private\\game-data.dev.js");
    var outputPath = fso.BuildPath(repoRoot, "data\\game-data.js");

    if (!fso.FileExists(sourcePath)) {
        WScript.Echo("ERROR: Private source file not found:");
        WScript.Echo(sourcePath);
        WScript.Quit(1);
    }

    var source = readUtf8(sourcePath);

    // Privacy guard: abort if analyzer-only material accidentally gets put in the public data source.
    var forbidden = [
        "saveAnalyzer",
        "Save Analyzer",
        "DayConstructionFinished",
        "typeBeforeChange",
        "Building Key",
        "buildingKeyGameProvided",
        "buildingKeySource",
        "Save-Data Reference"
    ];

    var hits = [];
    var j;
    for (j = 0; j < forbidden.length; j++) {
        if (source.indexOf(forbidden[j]) !== -1) hits.push(forbidden[j]);
    }

    if (hits.length) {
        WScript.Echo("BUILD BLOCKED.");
        WScript.Echo("Private Save Analyzer material was detected in game-data.dev.js:");
        for (j = 0; j < hits.length; j++) WScript.Echo("  - " + hits[j]);
        WScript.Echo("");
        WScript.Echo("Nothing was written to data\\game-data.js.");
        WScript.Quit(2);
    }

    var sanitized;
    try {
        sanitized = sanitizePublicSource(source);
    } catch (e) {
        WScript.Echo("BUILD BLOCKED.");
        WScript.Echo("Public-data sanitization failed:");
        WScript.Echo("  " + e.message);
        WScript.Echo("");
        WScript.Echo("Nothing was written to data\\game-data.js.");
        WScript.Quit(3);
    }

    // Defense in depth: these names must not survive into the public source.
    var privateOnly = [
        "observedTests",
        "testStart",
        "huntingHoundStatus",
        "huntingOutputStatus",
        "orchardMaturationExamples"
    ];
    var privateHits = [];
    for (j = 0; j < privateOnly.length; j++) {
        if (sanitized.indexOf(privateOnly[j]) !== -1) privateHits.push(privateOnly[j]);
    }
    if (privateHits.length) {
        WScript.Echo("BUILD BLOCKED.");
        WScript.Echo("Research-only fields survived public-data sanitization:");
        for (j = 0; j < privateHits.length; j++) WScript.Echo("  - " + privateHits[j]);
        WScript.Echo("");
        WScript.Echo("Nothing was written to data\\game-data.js.");
        WScript.Quit(4);
    }

    var output = minify(sanitized);
    writeUtf8NoBom(outputPath, output);

    WScript.Echo("SUCCESS");
    WScript.Echo("Built sanitized public file:");
    WScript.Echo(outputPath);
    WScript.Echo("Research-only fields were removed before minification.");
    WScript.Echo("");
    WScript.Echo("Readable source remains private and Git-ignored:");
    WScript.Echo(sourcePath);
})();
