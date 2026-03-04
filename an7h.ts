#!/usr/bin/env node
import { Command } from "commander";
import { execSync } from "child_process";
import { createHash } from "crypto";
import {
  readFileSync, writeFileSync, statSync, readdirSync,
  existsSync, mkdirSync, appendFileSync,
} from "fs";
import { join, resolve, basename, extname, dirname } from "path";
import { homedir, cpus, totalmem, freemem, platform, uptime, hostname } from "os";
import { createServer } from "http";

const program = new Command();


const c = {
  r:    (s: string) => `\x1b[31m${s}\x1b[0m`,
  g:    (s: string) => `\x1b[32m${s}\x1b[0m`,
  y:    (s: string) => `\x1b[33m${s}\x1b[0m`,
  b:    (s: string) => `\x1b[34m${s}\x1b[0m`,
  m:    (s: string) => `\x1b[35m${s}\x1b[0m`,
  cy:   (s: string) => `\x1b[36m${s}\x1b[0m`,
  d:    (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

const banner = () =>
  console.log(c.bold(c.cy(`\n  ╔═══════════════════╗\n  ║   an7h  v1.0.0    ║\n  ╚═══════════════════╝\n`)));

program
  .name("an7h")
  .version("1.0.0")
  .description("an7h — your personal developer toolkit");


program
  .command("sysinfo")
  .description("Detailed system snapshot: CPU, RAM, OS, uptime")
  .action(() => {
    const cpu = cpus();
    const totalMb = (totalmem() / 1024 / 1024).toFixed(0);
    const freeMb  = (freemem()  / 1024 / 1024).toFixed(0);
    const usedPct = (((totalmem() - freemem()) / totalmem()) * 100).toFixed(1);
    const up = uptime();
    const uh = Math.floor(up / 3600);
    const um = Math.floor((up % 3600) / 60);
    console.log(c.bold("\n  System Info\n  ───────────"));
    console.log(`  ${c.cy("Host")}     : ${hostname()}`);
    console.log(`  ${c.cy("OS")}       : ${platform()}`);
    console.log(`  ${c.cy("CPU")}      : ${cpu[0].model} (${cpu.length} cores)`);
    console.log(`  ${c.cy("RAM")}      : ${c.g(freeMb + " MB free")} / ${totalMb} MB  ${c.y(`[${usedPct}% used]`)}`);
    console.log(`  ${c.cy("Uptime")}   : ${uh}h ${um}m`);
    console.log(`  ${c.cy("Node")}     : ${process.version}`);
    console.log(`  ${c.cy("Platform")} : ${process.platform} ${process.arch}\n`);
  });


program
  .command("snap [dir]")
  .description("Snapshot a directory into a timestamped .tar.gz backup")
  .option("-o, --out <dir>", "Output folder", "~")
  .action((dir: string = ".", opts: { out: string }) => {
    const src  = resolve(dir);
    const name = basename(src);
    const ts   = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const outDir = opts.out.replace("~", homedir());
    const dest = join(outDir, `${name}_${ts}.tar.gz`);
    try {
      execSync(`tar -czf "${dest}" -C "${dirname(src)}" "${name}"`);
      const sizeb = statSync(dest).size;
      const sizeMb = (sizeb / 1024 / 1024).toFixed(2);
      console.log(c.g(`✓ Snapshot saved: ${dest}  (${sizeMb} MB)`));
    } catch (e: any) {
      console.error(c.r(`Snapshot failed: ${e.message}`));
    }
  });


program
  .command("clip <input>")
  .description("Copy a file's content or a raw string to the clipboard")
  .option("-s, --string", "Treat input as literal string, not a file path")
  .action((input: string, opts: { string?: boolean }) => {
    try {
      const text = opts.string ? input : readFileSync(resolve(input), "utf-8");
      const clipper = process.platform === "darwin" ? "pbcopy"
                    : process.platform === "win32"  ? "clip"
                    : "xclip -selection clipboard";
      execSync(clipper, { input: text });
      const preview = text.slice(0, 60).replace(/\n/g, "↵");
      console.log(c.g(`✓ Copied to clipboard: ${c.d(`"${preview}${text.length > 60 ? "…" : ""}"`)}` ));
    } catch (e: any) {
      console.error(c.r(`Clip failed: ${e.message}`));
    }
  });

program
  .command("rename <search> <replacement> [dir]")
  .description("Batch rename files: replace pattern in filenames (regex supported)")
  .option("-d, --dry-run", "Preview changes without renaming")
  .action((search: string, replacement: string, dir: string = ".", opts: { dryRun?: boolean }) => {
    const root  = resolve(dir);
    const rx    = new RegExp(search);
    const files = readdirSync(root);
    let count   = 0;
    for (const f of files) {
      const full    = join(root, f);
      if (!statSync(full).isFile()) continue;
      if (!rx.test(f)) continue;
      const newName = f.replace(rx, replacement);
      const dest    = join(root, newName);
      console.log(`  ${c.cy(f)} → ${c.g(newName)}`);
      if (!opts.dryRun) execSync(`mv "${full}" "${dest}"`);
      count++;
    }
    if (count === 0) console.log(c.y("No matching files found."));
    else if (opts.dryRun) console.log(c.d(`\n${count} files would be renamed (dry run)`));
    else console.log(c.g(`\n✓ ${count} files renamed`));
  });

program
  .command("netmon")
  .description("Spin up a local request logger — great as a webhook sink")
  .option("-p, --port <port>", "Listening port", "9999")
  .option("-l, --log <file>", "Also log to a file")
  .action((opts: { port: string; log?: string }) => {
    const port    = parseInt(opts.port);
    const logFile = opts.log ? resolve(opts.log) : null;
    let reqCount  = 0;
    const server  = createServer(async (req, res) => {
      reqCount++;
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf-8").slice(0, 2000);
        const ts   = new Date().toISOString();
        const line = `[${ts}] #${reqCount} ${req.method} ${req.url}`;
        console.log(`\n${c.bold(c.g(line))}`);
        if (req.headers["content-type"]) console.log(`  ${c.cy("Content-Type:")} ${req.headers["content-type"]}`);
        if (body) console.log(`  ${c.d("Body:")} ${body.slice(0, 300)}`);
        if (logFile) appendFileSync(logFile, line + (body ? `\n${body}` : "") + "\n\n");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, received: reqCount }));
      });
    });
    server.listen(port, () => {
      console.log(c.bold(c.cy(`\n  🌐 netmon listening on http://localhost:${port}`)));
      if (logFile) console.log(c.d(`  Logging to: ${logFile}`));
      console.log(c.d("  Ctrl+C to stop\n"));
    });
  });

program
  .command("mkscript <name>")
  .description("Generate a ready-to-run script with shebang + chmod +x")
  .option("-t, --type <type>", "bash | python | node", "bash")
  .action((name: string, opts: { type: string }) => {
    const shebangs: Record<string, string> = {
      bash:   "#!/usr/bin/env bash\nset -euo pipefail\n\n# Your script here\necho \"Hello from ${name}\"\n",
      python: `#!/usr/bin/env python3\n# ${name}.py\n\ndef main():\n    print("Hello from ${name}")\n\nif __name__ == "__main__":\n    main()\n`,
      node:   `#!/usr/bin/env node\n// ${name}.js\n\nconst main = () => {\n  console.log("Hello from ${name}");\n};\n\nmain();\n`,
    };
    const ext = opts.type === "bash" ? ".sh" : opts.type === "python" ? ".py" : ".js";
    const filename = name.endsWith(ext) ? name : name + ext;
    const fp = resolve(filename);
    if (existsSync(fp)) { console.error(c.r(`Already exists: ${fp}`)); process.exit(1); }
    const body = shebangs[opts.type] || shebangs.bash;
    writeFileSync(fp, body, { mode: 0o755 });
    console.log(c.g(`✓ Created ${filename}  (chmod +x applied)`));
  });

program
  .command("tree [dir]")
  .description("Pretty directory tree view (no external dependencies)")
  .option("-d, --depth <n>", "Max depth", "4")
  .option("--dirs", "Show directories only")
  .action((dir: string = ".", opts: { depth: string; dirs?: boolean }) => {
    const root    = resolve(dir);
    const maxDepth = parseInt(opts.depth);
    const skip    = new Set(["node_modules", ".git", "dist", ".next", "__pycache__", ".cache"]);
    let fileCount = 0;
    let dirCount  = 0;
    const walk = (d: string, prefix: string, depth: number) => {
      if (depth > maxDepth) return;
      let entries: string[];
      try { entries = readdirSync(d); } catch { return; }
      entries = entries.filter(e => !skip.has(e)).sort();
      entries.forEach((entry, i) => {
        const full    = join(d, entry);
        const isLast  = i === entries.length - 1;
        const branch  = isLast ? "└── " : "├── ";
        const childPfx = prefix + (isLast ? "    " : "│   ");
        let stat: ReturnType<typeof statSync>;
        try { stat = statSync(full); } catch { return; }
        if (stat.isDirectory()) {
          dirCount++;
          console.log(`${prefix}${branch}${c.b(entry)}/`);
          walk(full, childPfx, depth + 1);
        } else if (!opts.dirs) {
          fileCount++;
          const sizeKb = (stat.size / 1024).toFixed(1);
          console.log(`${prefix}${branch}${entry} ${c.d(`(${sizeKb} KB)`)}`);
        }
      });
    };
    console.log(c.bold(root));
    walk(root, "", 1);
    console.log(c.d(`\n${dirCount} dirs, ${fileCount} files`));
  });

program
  .command("checksum <file> [expected]")
  .description("Compute and optionally verify a file's SHA-256 checksum")
  .option("-a, --algo <algo>", "Hash algorithm: md5 | sha256 | sha512", "sha256")
  .action((file: string, expected: string | undefined, opts: { algo: string }) => {
    try {
      const data   = readFileSync(resolve(file));
      const digest = createHash(opts.algo).update(data).digest("hex");
      console.log(`  ${c.cy("File")} : ${file}`);
      console.log(`  ${c.cy("Algo")} : ${opts.algo}`);
      console.log(`  ${c.cy("Hash")} : ${c.bold(digest)}`);
      if (expected) {
        const match = digest.toLowerCase() === expected.toLowerCase();
        console.log(`  ${c.cy("Match")}: ${match ? c.g("✓ Verified OK") : c.r("✗ MISMATCH!")}`);
        if (!match) process.exit(1);
      }
    } catch (e: any) {
      console.error(c.r(`Error: ${e.message}`));
    }
  });

program
  .command("template <file> [vars...]")
  .description("Fill {{VAR}} placeholders in a text file  (e.g. NAME=Alice)")
  .option("-o, --out <file>", "Write result to file instead of stdout")
  .action((file: string, vars: string[], opts: { out?: string }) => {
    try {
      let content = readFileSync(resolve(file), "utf-8");
      const map: Record<string, string> = {};
      for (const v of vars) {
        const [k, ...rest] = v.split("=");
        map[k.trim()] = rest.join("=");
      }
      let substitutions = 0;
      content = content.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        if (key in map) { substitutions++; return map[key]; }
        return `{{${key}}}`;  // leave unknowns intact
      });
      if (opts.out) {
        writeFileSync(resolve(opts.out), content);
        console.log(c.g(`✓ Written to ${opts.out}  (${substitutions} substitutions)`));
      } else {
        console.log(content);
      }
    } catch (e: any) {
      console.error(c.r(`Template error: ${e.message}`));
    }
  });

program
  .command("dupefind [dir]")
  .description("Scan a directory for duplicate files (by SHA-256 content hash)")
  .option("--min-size <bytes>", "Skip files smaller than this", "1")
  .action((dir: string = ".", opts: { minSize: string }) => {
    const root    = resolve(dir);
    const minSize = parseInt(opts.minSize);
    const hashes: Record<string, string[]> = {};
    const skip    = new Set(["node_modules", ".git", "dist", ".next", "__pycache__"]);
    const walk    = (d: string) => {
      let entries: string[];
      try { entries = readdirSync(d); } catch { return; }
      for (const f of entries) {
        if (skip.has(f)) continue;
        const full = join(d, f);
        try {
          const s = statSync(full);
          if (s.isDirectory()) { walk(full); continue; }
          if (s.size < minSize) continue;
          const h = createHash("sha256").update(readFileSync(full)).digest("hex");
          (hashes[h] = hashes[h] || []).push(full);
        } catch {}
      }
    };
    console.log(c.d("Scanning…"));
    walk(root);
    const dupes = Object.values(hashes).filter(g => g.length > 1);
    if (!dupes.length) {
      console.log(c.g("No duplicate files found ✓"));
      return;
    }
    let totalWaste = 0;
    dupes.forEach((group, i) => {
      const size = statSync(group[0]).size;
      const waste = size * (group.length - 1);
      totalWaste += waste;
      console.log(c.bold(`\nGroup ${i + 1}  ${c.d(`(${(size / 1024).toFixed(1)} KB each, ${group.length} copies)`)}`));
      group.forEach(f => console.log(`  ${c.cy(f)}`));
    });
    console.log(c.y(`\nTotal wasted space: ${(totalWaste / 1024).toFixed(1)} KB across ${dupes.length} groups`));
  });

program
  .command("linecount [dir]")
  .description("Count source lines of code grouped by file extension")
  .option("--include <exts>", "Comma-separated extensions, e.g. ts,js,py")
  .action((dir: string = ".", opts: { include?: string }) => {
    const root    = resolve(dir);
    const allowed = opts.include ? new Set(opts.include.split(",").map(e => "." + e.trim())) : null;
    const skip    = new Set(["node_modules", ".git", "dist", ".next", "__pycache__", ".cache"]);
    const stats: Record<string, { files: number; lines: number; code: number; blank: number }> = {};
    const walk = (d: string) => {
      let entries: string[];
      try { entries = readdirSync(d); } catch { return; }
      for (const f of entries) {
        if (skip.has(f)) continue;
        const full = join(d, f);
        try {
          const s = statSync(full);
          if (s.isDirectory()) { walk(full); continue; }
          const ext = extname(f) || ".no-ext";
          if (allowed && !allowed.has(ext)) continue;
          const lines = readFileSync(full, "utf-8").split("\n");
          const blank = lines.filter(l => !l.trim()).length;
          if (!stats[ext]) stats[ext] = { files: 0, lines: 0, code: 0, blank: 0 };
          stats[ext].files++;
          stats[ext].lines += lines.length;
          stats[ext].code  += lines.length - blank;
          stats[ext].blank += blank;
        } catch {}
      }
    };
    walk(root);
    if (!Object.keys(stats).length) { console.log(c.y("No files found.")); return; }
    const col = (s: string, w: number) => s.padStart(w);
    console.log(c.bold(`\n  ${"Ext".padEnd(12)} ${"Files".padStart(6)} ${"Lines".padStart(8)} ${"Code".padStart(8)} ${"Blank".padStart(8)}`));
    console.log("  " + "─".repeat(44));
    let tf = 0, tl = 0, tc = 0, tb = 0;
    Object.entries(stats)
      .sort((a, b) => b[1].code - a[1].code)
      .forEach(([ext, s]) => {
        console.log(`  ${c.cy(ext.padEnd(12))} ${col(String(s.files), 6)} ${c.g(col(String(s.lines), 8))} ${col(String(s.code), 8)} ${c.d(col(String(s.blank), 8))}`);
        tf += s.files; tl += s.lines; tc += s.code; tb += s.blank;
      });
    console.log("  " + "─".repeat(44));
    console.log(c.bold(`  ${"TOTAL".padEnd(12)} ${col(String(tf), 6)} ${col(String(tl), 8)} ${col(String(tc), 8)} ${col(String(tb), 8)}\n`));
  });

program
  .command("note [text]")
  .description("Quick inline notes stored in .an7h/notes.md")
  .option("-l, --list", "List all notes")
  .option("-c, --clear", "Clear all notes")
  .option("--grep <query>", "Search notes")
  .action((text: string | undefined, opts: { list?: boolean; clear?: boolean; grep?: string }) => {
    const noteDir  = join(process.cwd(), ".an7h");
    const noteFile = join(noteDir, "notes.md");
    if (!existsSync(noteDir)) mkdirSync(noteDir, { recursive: true });

    if (opts.clear) {
      writeFileSync(noteFile, "");
      console.log(c.g("✓ Notes cleared"));
      return;
    }

    if (opts.grep) {
      if (!existsSync(noteFile)) { console.log(c.y("No notes yet.")); return; }
      const lines = readFileSync(noteFile, "utf-8").split("\n");
      const rx = new RegExp(opts.grep, "i");
      const matches = lines.filter(l => rx.test(l));
      if (matches.length) matches.forEach(l => console.log(c.y(l)));
      else console.log(c.y("No matching notes."));
      return;
    }

    if (opts.list || !text) {
      if (!existsSync(noteFile)) { console.log(c.y("No notes yet. Add one: an7h note \"your note\"")); return; }
      const content = readFileSync(noteFile, "utf-8").trim();
      if (!content) { console.log(c.y("No notes yet.")); return; }
      console.log(c.bold("\n  📝 Notes\n  ────────"));
      console.log(content);
      console.log();
      return;
    }

    const ts   = new Date().toLocaleString("en-IN");
    const line = `- [${ts}] ${text}`;
    appendFileSync(noteFile, line + "\n");
    console.log(c.g(`✓ Note saved: ${c.d(text)}`));
  });

program.parse(process.argv);
