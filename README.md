# an7h

**an7h** is a personal developer toolkit CLI — a single binary with a collection of everyday utilities for system info, file management, scripting, and more.

---

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v16+
- npm

### Install dependencies

```bash
npm install
```

### Build

Compiles TypeScript to JavaScript and marks the output executable:

```bash
npm run build
```

### Link globally (optional)

After building, link `an7h` as a global command:

```bash
npm link
```

You can then run `an7h <command>` from anywhere. Without linking, prefix commands with `node an7h.js`.

### Development mode

Run directly without building using `ts-node`:

```bash
npm run dev -- <command> [args]
# e.g.
npm run dev -- sysinfo
```

---

## Available Commands

| Command | Description |
|---|---|
| `sysinfo` | Detailed system snapshot: CPU, RAM, OS, uptime |
| `snap [dir]` | Snapshot a directory into a timestamped `.tar.gz` backup |
| `clip <input>` | Copy a file's content or a raw string to the clipboard |
| `rename <search> <replacement> [dir]` | Batch rename files (regex supported) |
| `netmon` | Spin up a local HTTP request logger / webhook sink |
| `mkscript <name>` | Generate a ready-to-run script with shebang + `chmod +x` |
| `tree [dir]` | Pretty directory tree view |
| `checksum <file> [expected]` | Compute and optionally verify a file's hash |
| `template <file> [vars...]` | Fill `{{VAR}}` placeholders in a text file |
| `dupefind [dir]` | Scan a directory for duplicate files by content |
| `linecount [dir]` | Count source lines of code grouped by file extension |
| `note [text]` | Quick inline notes stored in `.an7h/notes.md` |

Run `an7h --help` or `an7h <command> --help` for full option details.

---

## Example Usage

### `sysinfo`
```bash
an7h sysinfo
```
Prints hostname, OS, CPU model/cores, RAM usage, uptime, and Node.js version.

---

### `snap`
```bash
# Snapshot current directory to ~
an7h snap

# Snapshot a specific folder, output to /tmp
an7h snap ./my-project --out /tmp
```

---

### `clip`
```bash
# Copy a file's content to clipboard
an7h clip ./README.md

# Copy a literal string to clipboard
an7h clip "hello world" --string
```

---

### `rename`
```bash
# Preview renames matching a pattern (dry run)
an7h rename "\.txt$" ".md" ./docs --dry-run

# Apply renames
an7h rename "report_(\d+)" "summary_$1" ./reports
```

---

### `netmon`
```bash
# Start request logger on default port 9999
an7h netmon

# Custom port, also write to a log file
an7h netmon --port 8080 --log requests.log
```
Send any HTTP request to `http://localhost:9999` and watch it logged in the terminal.

---

### `mkscript`
```bash
# Create a bash script
an7h mkscript deploy

# Create a Python script
an7h mkscript analyse --type python

# Create a Node.js script
an7h mkscript server --type node
```

---

### `tree`
```bash
# Tree of current directory (max depth 4)
an7h tree

# Tree of a specific path, depth 2, directories only
an7h tree ./src --depth 2 --dirs
```

---

### `checksum`
```bash
# Compute SHA-256
an7h checksum ./release.zip

# Verify against an expected hash
an7h checksum ./release.zip abc123def456... 

# Use a different algorithm
an7h checksum ./file.bin --algo md5
```

---

### `template`
```bash
# Print filled template to stdout
an7h template ./email.txt NAME=Alice ROLE=Engineer

# Write result to a new file
an7h template ./email.txt NAME=Bob --out ./output.txt
```
Placeholders in the file should use the `{{VAR}}` syntax.

---

### `dupefind`
```bash
# Scan current directory
an7h dupefind

# Scan a specific directory, skip small files
an7h dupefind ./downloads --min-size 10240
```

---

### `linecount`
```bash
# Count all files in current directory
an7h linecount

# Count only TypeScript and JavaScript files
an7h linecount ./src --include ts,js
```

---

### `note`
```bash
# Add a note
an7h note "remember to update the docs"

# List all notes
an7h note --list

# Search notes
an7h note --grep "docs"

# Clear all notes
an7h note --clear
```
Notes are persisted in `.an7h/notes.md` relative to your current working directory.

---
