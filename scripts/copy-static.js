const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

function remove(dir){
  if(fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copy(src, dest){
  if(!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if(stat.isDirectory()){
    fs.mkdirSync(dest, { recursive: true });
    for(const name of fs.readdirSync(src)){
      copy(path.join(src, name), path.join(dest, name));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

remove(dist);
fs.mkdirSync(dist, { recursive: true });

[
  "challenge.html",
  "admin.html",
  "404.html",
  "index.html"
].forEach((file) => copy(path.join(root, file), path.join(dist, file)));

copy(path.join(root, "assets"), path.join(dist, "assets"));
copy(path.join(root, "public"), path.join(dist, "public"));

console.log("Copied static site into dist/ for Vercel.");
