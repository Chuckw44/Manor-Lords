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

    var output = minify(source);
    writeUtf8NoBom(outputPath, output);

    WScript.Echo("SUCCESS");
    WScript.Echo("Built public file:");
    WScript.Echo(outputPath);
    WScript.Echo("");
    WScript.Echo("Readable source remains private and Git-ignored:");
    WScript.Echo(sourcePath);
})();
